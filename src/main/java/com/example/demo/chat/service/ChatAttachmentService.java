package com.example.demo.chat.service;

import com.example.demo.chat.dto.ChatAttachmentDto;
import com.example.demo.chat.dto.ChatAttachmentSlice;
import com.example.demo.chat.dto.ChatAttachmentSummaryDto;
import com.example.demo.chat.dto.UploadAttachmentResponse;
import com.example.demo.chat.entity.ChatAttachment;
import com.example.demo.chat.entity.ChatRoom;
import com.example.demo.chat.entity.ChatRoomParticipant;
import com.example.demo.chat.repository.ChatAttachmentRepository;
import com.example.demo.chat.repository.ChatRoomParticipantRepository;
import com.example.demo.chat.repository.ChatRoomRepository;
import com.example.demo.staff.Staff;
import com.example.demo.staff.StaffRepository;
import com.example.demo.user.User;
import com.example.demo.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatAttachmentService {
    @Value("${cloud.aws.s3.bucket}")
    private String bucket;

    private final S3Client s3Client;
    private final UserRepository userRepository;
    private final StaffRepository staffRepository;
    private final ChatRoomRepository roomRepository;
    private final ChatAttachmentRepository attachmentRepository;
    private final ChatRoomParticipantRepository participantRepository;
    private final S3Presigner s3Presigner;

    public ChatAttachmentSlice getChatRoomAttachments(Integer userId, Integer roomId, Integer cursor, int size){
        User user=userRepository.findByUserId(userId)
                .orElseThrow(()->new RuntimeException("존재하지 않는 사용자입니다."));

        ChatRoom room=roomRepository.findByRoomId(roomId)
                .orElseThrow(()->new RuntimeException("채팅방이 존재하지 않습니다."));

        ChatRoomParticipant participant=participantRepository.findByRoomAndUser(room, user)
                .orElseThrow(()->new RuntimeException("채팅방 참가자가 아닙니다."));

        LocalDateTime joinedAt=participant.getJoinedAt();

        Pageable pageable= PageRequest.of(0, size);
        Slice<ChatAttachment> slice;

        if (cursor == null){
            slice=attachmentRepository.findByRoomId(room.getRoomId(), joinedAt, pageable);
        } else {
            slice= attachmentRepository.findByRoomIdAndMessageIdLessThan(room.getRoomId(), joinedAt, cursor, pageable);
        }

        List<ChatAttachmentSummaryDto> attachmentSummaries=slice.getContent().stream().map(a -> {
            Staff staff=staffRepository.findByUser(a.getMessage().getUser())
                    .orElseThrow(()->new RuntimeException("존재하지 않는 직원입니다."));

                    return ChatAttachmentSummaryDto.builder()
                            .roomId(room.getRoomId())
                            .userId(staff.getUser().getUserId())
                            .username(staff.getName())
                            .messageId(a.getMessage().getMessageId())
                            .attachmentId(a.getAttachmentId())
                            .originalFileName(a.getOriginalFileName())
                            .storedFileName(a.getStoredFileName())
                            .fileUrl(generatePresignedUrl(a.getStoredFileName()))
                            .contentType(a.getContentType())
                            .fileExtension(a.getFileExtension())
                            .fileSize(a.getFileSize())
                            .createdAt(a.getMessage().getCreatedAt()).build();
        }).toList();

        Integer nextCursor=null;
        if (!attachmentSummaries.isEmpty()){
            nextCursor=attachmentSummaries.get(attachmentSummaries.size() - 1).getMessageId();
        }

        ChatAttachmentSlice attachmentSlice=ChatAttachmentSlice.builder()
                .attachments(attachmentSummaries).hasNext(slice.hasNext()).nextCursor(nextCursor).build();

        return attachmentSlice;
    }

    public List<UploadAttachmentResponse> uploadFiles(List<MultipartFile> files){
        if (files == null || files.isEmpty()){
            throw new IllegalArgumentException("업로드 할 파일이 없습니다.");
        }

        List<UploadAttachmentResponse> responses=new ArrayList<>();

        for (MultipartFile file:files){
            if (file == null || file.isEmpty()){
                continue;
            }

            validateFile(file);

            String originalFileName=file.getOriginalFilename();
            String storedFileName=UUID.randomUUID() + "_" + originalFileName;
            String contentType=file.getContentType();
            String fileExtension=extractExtension(originalFileName);
            Long fileSize=file.getSize();

            try{
                PutObjectRequest putObjectRequest=PutObjectRequest.builder()
                        .bucket(bucket)
                        .key(storedFileName)
                        .contentType(file.getContentType())
                        .build();

                s3Client.putObject(
                        putObjectRequest,
                        RequestBody.fromBytes(file.getBytes())
                );

                responses.add(UploadAttachmentResponse.builder()
                        .originalFileName(originalFileName)
                        .storedFileName(storedFileName)
                        .contentType(contentType)
                        .fileExtension(fileExtension)
                        .fileSize(fileSize)
                        .build());

            } catch (IOException e) {
                throw new RuntimeException("파일 업로드 중 오류가 발생했습니다. " , e);
            }
        }

        if (responses.isEmpty()){
            throw new RuntimeException("유효한 파일이 없습니다.");
        }

        return responses;
    }

    public String generatePresignedUrl(String storedFileName){
        GetObjectRequest getObjectRequest=GetObjectRequest.builder()
                .bucket(bucket)
                .key(storedFileName)
                .build();

        GetObjectPresignRequest presignRequest=GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(60))
                .getObjectRequest(getObjectRequest)
                .build();

        return s3Presigner.presignGetObject(presignRequest).url().toString();
    }

    private void validateFile(MultipartFile file) {
        if (file.getOriginalFilename() == null || file.getOriginalFilename().isBlank()) {
            throw new IllegalArgumentException("파일명이 올바르지 않습니다.");
        }
    }

    private String extractExtension(String fileName) {
        int lastDotIndex = fileName.lastIndexOf(".");

        if (lastDotIndex == -1 || lastDotIndex == fileName.length() - 1) {
            return "";
        }

        return fileName.substring(lastDotIndex + 1).toLowerCase();
    }
}
