package com.example.demo.chat.controller;

import com.example.demo.chat.dto.ChatAttachmentDto;
import com.example.demo.chat.dto.ChatAttachmentSlice;
import com.example.demo.chat.dto.UploadAttachmentResponse;
import com.example.demo.chat.service.ChatAttachmentService;
import com.example.demo.security.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.parameters.P;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class ChatAttachmentController {
    private final ChatAttachmentService attachmentService;

    @PostMapping("/chat/upload/attachment")
    public ResponseEntity<Map<String, Object>> testUpload(@RequestParam("files") List<MultipartFile> files){
        List<UploadAttachmentResponse> responses=attachmentService.uploadFiles(files);
        return ResponseEntity.ok(Map.of("result", responses));
    }

    @GetMapping("/chat/room/{roomId}/attachment")
    public ResponseEntity<Map<String,Object>> openAttachmentArchive(@PathVariable Integer roomId,
                                                                    @RequestParam(name = "cursor", required = false) Integer cursor,
                                                                    @AuthenticationPrincipal CustomUserDetails details){
        if (details == null){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error","사용자 정보가 존재하지 않습니다."));
        }

        Integer userId=details.getUserId();
        if (userId == null){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error","사용자 정보를 읽을 수 없습니다."));
        }
        try{
            int size=20;
            ChatAttachmentSlice slice=attachmentService.getChatRoomAttachments(userId, roomId, cursor, size);
            return ResponseEntity.ok(Map.of("slice", slice));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error","서버에 오류가 발생했습니다."));
        }
    }
}
