package com.example.demo.chat.service;

import com.example.demo.chat.ChatMessageType;
import com.example.demo.chat.dto.*;
import com.example.demo.chat.entity.ChatAttachment;
import com.example.demo.chat.entity.ChatMessage;
import com.example.demo.chat.entity.ChatRoom;
import com.example.demo.chat.entity.ChatRoomParticipant;
import com.example.demo.chat.repository.ChatAttachmentRepository;
import com.example.demo.chat.repository.ChatMessageRepository;
import com.example.demo.chat.repository.ChatRoomParticipantRepository;
import com.example.demo.chat.repository.ChatRoomRepository;
import com.example.demo.staff.Staff;
import com.example.demo.staff.StaffRepository;
import com.example.demo.user.User;
import com.example.demo.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
@RequiredArgsConstructor
public class ChatMessageService {
    private final ChatMessageRepository messageRepository;
    private final ChatRoomRepository roomRepository;
    private final ChatRoomParticipantRepository participantRepository;
    private final UserRepository userRepository;
    private final StaffRepository staffRepository;
    private final ChatRoomService roomService;
    private final ChatAttachmentRepository attachmentRepository;
    private final ChatAttachmentService attachmentService;

    public ChatMessageDto sendChatMessage(SendMessageRequest request, Integer userId){
        User user=userRepository.findByUserId(userId).orElseThrow(()->new RuntimeException("존재하지 않는 사용자입니다."));

        Staff staff=staffRepository.findByUser(user)
                .orElseThrow(()->new RuntimeException("존재하지 않는 직원입니다."));

        ChatRoom room=roomRepository.findByRoomId(request.getRoomId()).orElseThrow(()->new RuntimeException("채팅방이 존재하지 않습니다."));

        ChatRoomParticipant participant=participantRepository.findByRoomAndUser_UserId(room, userId)
                .orElseThrow(()->new RuntimeException("채팅방 참가자가 아닙니다."));

        ParentMessageDto parentMessageDto=null;
        ChatMessage parentMessage=null;
        if (request.getParentMessageId() != null){
            parentMessage=messageRepository.findByMessageId(request.getParentMessageId())
                    .orElseThrow(()->new RuntimeException("존재하지 않는 메시지입니다."));

            if (parentMessage.getMessageType() == ChatMessageType.SYSTEM){
                throw new RuntimeException("시스템 메시지에는 답장할 수 없습니다.");
            }

            if (!room.getRoomId().equals(parentMessage.getRoom().getRoomId())){
                throw new RuntimeException("같은 채팅방의 메시지가 아닙니다.");
            }

            if (parentMessage.isDeleted()){
                throw new RuntimeException("삭제된 메시지에는 답장할 수 없습니다.");
            }

            parentMessageDto=toParentMessageDto(parentMessage, false);
        }

        boolean hasContent=request.getContent() != null && !request.getContent().isBlank();
        boolean hasAttachment=request.getAttachments() != null && !request.getAttachments().isEmpty();

        if (!hasContent && !hasAttachment){
            throw new RuntimeException("메시지 내용과 파일이 모두 존재하지 않습니다.");
        }

        ChatMessage saveMessage=messageRepository.save(ChatMessage.builder()
                .room(room)
                .user(user)
                .messageType(ChatMessageType.USER)
                .content(hasContent ? request.getContent().trim() : null)
                .parentMessage(parentMessage).build());

        room.setLastMessageId(saveMessage.getMessageId());
        room.setLastMessageAt(saveMessage.getCreatedAt());

        participant.setLastReadMessageId(saveMessage.getMessageId());
        participant.setLastReadAt(saveMessage.getCreatedAt());

        if (hasAttachment){
            for (ChatAttachmentDto file:request.getAttachments()){
                ChatAttachment attachment=ChatAttachment.builder()
                        .message(saveMessage)
                        .originalFileName(file.getOriginalFileName())
                        .storedFileName(file.getStoredFileName())
                        .contentType(file.getContentType())
                        .fileExtension(file.getFileExtension())
                        .fileSize(file.getFileSize()).build();
                attachmentRepository.save(attachment);
            }
        }

        List<ChatAttachmentDto> attachments=toAttachmentDto(saveMessage.getMessageId());

        Long unreadCount=participantRepository.countUnreadParticipants(room.getRoomId(), user.getUserId(),
                saveMessage.getMessageId());

        List<ChatRoomParticipant> participants=participantRepository.findByRoom_RoomId(room.getRoomId());
        List<Integer> participantIds=participants.stream().map(p -> p.getUser().getUserId()).toList();

        return  ChatMessageDto.builder()
                .messageId(saveMessage.getMessageId())
                .roomId(room.getRoomId())
                .senderId(user.getUserId())
                .senderName(staff.getName())
                .messageType(saveMessage.getMessageType().name())
                .content(hasContent ? saveMessage.getContent():null)
                .parentMessage(parentMessageDto)
                .attachments(attachments)
                .mine(true)
                .createdAt(saveMessage.getCreatedAt())
                .unreadCount(unreadCount)
                .participantIds(participantIds).build();
    }

    public ChatMessageDto deleteMessage(Integer messageId, Integer userId){
        ChatMessage message=messageRepository.findByMessageId(messageId)
                .orElseThrow(() -> new RuntimeException("존재하지 않는 메시지입니다."));

        if(message.getMessageType() == ChatMessageType.SYSTEM){
            throw new IllegalArgumentException("시스템 메시지는 삭제할 수 없습니다.");
        }

        Staff staff=staffRepository.findByUser_UserId(userId)
                .orElseThrow(()->new RuntimeException("존재하지 않는 직원입니다."));

        if(!message.getUser().getUserId().equals(userId)){
            throw new IllegalArgumentException("본인 메시지만 삭제할 수 있습니다.");
        }

        if(message.isDeleted()){
            throw new IllegalArgumentException("이미 삭제된 메시지입니다.");
        }

        message.setDeleted(true);
        message.setDeletedAt(LocalDateTime.now());
        ChatMessage deleteMessage=messageRepository.save(message);

        List<ChatRoomParticipant> participants=participantRepository.findByRoom(deleteMessage.getRoom());
        List<Integer> participantIds=new ArrayList<>();
        for (ChatRoomParticipant p:participants){
            if (p.getUser().getUserId().equals(userId)) continue;
            participantIds.add(p.getUser().getUserId());
        }

        ParentMessageDto parentMessage=null;
        ChatMessage parent=deleteMessage.getParentMessage();
        if (parent != null){
            parentMessage=toParentMessageDto(parent, parent.isDeleted());
        }

        return ChatMessageDto.builder()
                .messageId(deleteMessage.getMessageId())
                .roomId(deleteMessage.getRoom().getRoomId())
                .senderId(deleteMessage.getUser().getUserId())
                .senderName(staff.getName())
                .content(null)
                .mine(deleteMessage.getUser().getUserId().equals(userId))
                .messageType(deleteMessage.getMessageType().name())
                .createdAt(deleteMessage.getCreatedAt())
                .deleted(deleteMessage.isDeleted())
                .deletedAt(deleteMessage.getDeletedAt())
                .edited(deleteMessage.isEdited())
                .editedAt(deleteMessage.getEditedAt())
                .parentMessage(parentMessage)
                .participantIds(participantIds)
                .lastMessage(deleteMessage.getMessageId().equals(deleteMessage.getRoom().getLastMessageId()))
                .attachments(List.of())
                .build();
    }

    public ChatMessageDto editMessage(Integer messageId, String content, Integer userId){
        ChatMessage message=messageRepository.findByMessageId(messageId)
                .orElseThrow(() -> new RuntimeException("존재하지 않는 메시지입니다."));

        if(message.getMessageType() == ChatMessageType.SYSTEM){
            throw new IllegalArgumentException("시스템 메시지는 수정할 수 없습니다.");
        }

        if(!message.getUser().getUserId().equals(userId)){
            throw new IllegalArgumentException("본인 메시지만 수정할 수 있습니다.");
        }

        if(message.isDeleted()){
            throw new IllegalArgumentException("삭제된 메시지는 수정할 수 없습니다.");
        }

        if (message.getContent() == null || message.getContent().isBlank()){
            throw new RuntimeException("파일만 전송한 메시지는 수정할 수 없습니다.");
        }

        if(content == null || content.trim().isEmpty()){
            throw new IllegalArgumentException("수정할 메시지 내용을 입력하세요.");
        }

        Staff sendStaff=staffRepository.findByUser_UserId(userId)
                .orElseThrow(()->new RuntimeException("존재하지 않는 직원입니다."));

        message.setEdited(true);
        message.setEditedAt(LocalDateTime.now());
        message.setContent(content.trim());
        ChatMessage editMessage=messageRepository.save(message);

        List<ChatRoomParticipant> participants=participantRepository.findByRoom(editMessage.getRoom());
        List<Integer> participantIds=new ArrayList<>();
        for (ChatRoomParticipant p:participants){
            if (p.getUser().getUserId().equals(userId)) continue;
            participantIds.add(p.getUser().getUserId());
        }

        ParentMessageDto parentMessage=null;
        ChatMessage parent=editMessage.getParentMessage();
        if (parent != null){
            parentMessage=toParentMessageDto(parent, parent.isDeleted());
        }

        return ChatMessageDto.builder()
                .messageId(editMessage.getMessageId())
                .roomId(editMessage.getRoom().getRoomId())
                .senderName(sendStaff.getName())
                .senderId(editMessage.getUser().getUserId())
                .content(editMessage.getContent())
                .mine(editMessage.getUser().getUserId().equals(userId))
                .messageType(editMessage.getMessageType().name())
                .createdAt(editMessage.getCreatedAt())
                .edited(editMessage.isEdited())
                .editedAt(editMessage.getEditedAt())
                .deleted(editMessage.isDeleted())
                .deletedAt(editMessage.getDeletedAt())
                .parentMessage(parentMessage)
                .participantIds(participantIds)
                .lastMessage(editMessage.getMessageId().equals(editMessage.getRoom().getLastMessageId()))
                .attachments(toAttachmentDto(editMessage.getMessageId()))
                .build();
    }

    public MessageSlice getMessages(Integer roomId, Integer cursor, int size, Integer userId){
        Pageable pageable= PageRequest.of(0, size);
        Slice<ChatMessage> slice;

        User user=userRepository.findByUserId(userId)
                .orElseThrow(()->new RuntimeException("존재하지 않는 사용자입니다."));

        ChatRoom room=roomRepository.findByRoomId(roomId)
                .orElseThrow(()->new RuntimeException("채팅방이 존재하지 않습니다."));

        ChatRoomParticipant participant=participantRepository.findByRoomAndUser(room, user)
                .orElseThrow(()->new RuntimeException("채팅방 참가자가 아닙니다."));

        LocalDateTime joinedAt=participant.getJoinedAt();

        if (cursor == null){
            slice=messageRepository.findByRoom_RoomIdAndCreatedAtGreaterThanEqualOrderByMessageIdDesc(
                    roomId, joinedAt, pageable
            );
        } else {
            slice=messageRepository.findByRoom_RoomIdAndCreatedAtGreaterThanEqualAndMessageIdLessThanOrderByMessageIdDesc(
                    roomId, joinedAt, cursor, pageable
            );
        }

        List<ChatMessageDto> messages=slice.getContent().stream()
                .map(message -> toDto(message, userId)).collect(Collectors.toList());

        Collections.reverse(messages);

        Integer nextCursor=null;
        if (!messages.isEmpty()){
            nextCursor=messages.get(0).getMessageId();
        }

        MessageSlice messageSlice=MessageSlice.builder()
                .messages(messages)
                .hasNext(slice.hasNext())
                .nextCursor(nextCursor).build();


        if (cursor == null){
            roomService.markAsRead(roomId, userId);
        }

        return messageSlice;
    }

    private List<ChatAttachmentDto> toAttachmentDto(Integer messageId){
        List<ChatAttachment> attachments=attachmentRepository.findByMessage_MessageId(messageId);
        return attachments.stream().map(
                a -> ChatAttachmentDto.builder()
                        .attachmentId(a.getAttachmentId())
                        .messageId(a.getMessage().getMessageId())
                        .originalFileName(a.getOriginalFileName())
                        .storedFileName(a.getStoredFileName())
                        .fileUrl(attachmentService.generatePresignedUrl(a.getStoredFileName()))
                        .contentType(a.getContentType())
                        .fileExtension(a.getFileExtension())
                        .fileSize(a.getFileSize())
                        .createdAt(a.getCreatedAt()).build()
        ).toList();
    }

    private ParentMessageDto toParentMessageDto(ChatMessage parent, boolean hidden){
        if (parent == null) return null;

        ParentMessageDto dto=new ParentMessageDto();
        dto.setParentMessageId(parent.getMessageId());
        dto.setParentMessageContent(parent.isDeleted() ? null : parent.getContent());
        dto.setParentMessageIsDeleted(parent.isDeleted());

        if (parent.getUser() != null){
            Staff staff=staffRepository.findByUser(parent.getUser())
                    .orElseThrow(()->new RuntimeException("존재하지 않는 직원입니다."));
            dto.setParentMessageUserName(staff.getName());
        }

        if (hidden && parent.isDeleted()){
            dto.setParentMessageAttachments(List.of());
        } else {
            dto.setParentMessageAttachments(toAttachmentDto(parent.getMessageId()));
        }

        return dto;
    }

    private ChatMessageDto toDto(ChatMessage message, Integer loginUserId){
        User sender = message.getUser();
        Long unreadCount = 0L;
        String senderName = null;

        if (message.getMessageType() == ChatMessageType.USER && sender != null){
            unreadCount = participantRepository.countUnreadParticipants(
                    message.getRoom().getRoomId(),
                    sender.getUserId(),
                    message.getMessageId()
            );
        }

        if (sender != null){
            Staff staff = staffRepository.findByUser_UserId(sender.getUserId())
                    .orElseThrow(() -> new RuntimeException("존재하지 않는 직원입니다. (메시지 발신자)"));
            senderName = staff.getName();
        }

        ParentMessageDto parentMessage=null;
        ChatMessage parent=message.getParentMessage();
        if (parent != null){
            parentMessage=toParentMessageDto(parent, parent.isDeleted());
        }

        List<ChatAttachmentDto> attachments=message.isDeleted() ? List.of() : toAttachmentDto(message.getMessageId());

        return ChatMessageDto.builder()
                .messageId(message.getMessageId())
                .roomId(message.getRoom().getRoomId())
                .senderId(sender != null ? sender.getUserId() : null)
                .senderName(senderName)
                .messageType(message.getMessageType().name())
                .content(message.isDeleted() ? null : message.getContent())
                .createdAt(message.getCreatedAt())
                .unreadCount(unreadCount)
                .mine(sender != null && sender.getUserId().equals(loginUserId))
                .deleted(message.isDeleted())
                .deletedAt(message.getDeletedAt())
                .edited(message.isEdited())
                .editedAt(message.getEditedAt())
                .parentMessage(parentMessage)
                .attachments(attachments)
                .build();
    }
}
