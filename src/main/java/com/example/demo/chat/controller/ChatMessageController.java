package com.example.demo.chat.controller;

import com.example.demo.chat.dto.ChatMessageDto;
import com.example.demo.chat.dto.SendMessageRequest;
import com.example.demo.chat.dto.UpdateMessageRequest;
import com.example.demo.chat.service.ChatMessageService;
import com.example.demo.security.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequiredArgsConstructor
public class ChatMessageController {
    private final ChatMessageService messageService;
    private final SimpMessagingTemplate messagingTemplate;

    @PostMapping("/chat/send/user")
    public ResponseEntity<Map<String,Object>> sendUserMessage(@RequestBody SendMessageRequest dto,
                                             @AuthenticationPrincipal CustomUserDetails details){
        if (details == null){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error","로그인 후 이용하세요."));
        }

        Integer userId=details.getUserId();
        if (userId == null){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "사용자 정보를 찾을 수 없습니다."));
        }

        try{
            ChatMessageDto message=messageService.sendChatMessage(dto, userId);
            return ResponseEntity.ok(Map.of("result", message));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error","서버 오류!"));
        }
    }

    @DeleteMapping("/chat/delete/message/{messageId}")
    public ResponseEntity<Map<String, Object>> deleteMessage(@PathVariable Integer messageId,
                                                             @AuthenticationPrincipal CustomUserDetails details){
        if (details == null){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error","로그인 후 이용하세요."));
        }

        Integer userId=details.getUserId();
        if (userId == null){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "사용자 정보를 찾을 수 없습니다."));
        }

        try{
            ChatMessageDto message=messageService.deleteMessage(messageId, userId);

            List<Integer> targetUserIds=message.getParticipantIds();
            for (Integer id:targetUserIds){
                messagingTemplate.convertAndSendToUser(id.toString(),
                        "/queue/chat/room/" + message.getRoomId() + "/message/update", Map.of("result",message));
            }

            return ResponseEntity.ok(Map.of("result", message));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error","서버에 오류가 발생했습니다."));
        }
    }

    @PutMapping("/chat/edit/message/{messageId}")
    public ResponseEntity<Map<String,Object>> editMessage(@PathVariable Integer messageId,
                                                          @RequestBody UpdateMessageRequest request,
                                                          @AuthenticationPrincipal CustomUserDetails details){
        if (details == null){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error","로그인 후 이용하세요."));
        }

        Integer userId=details.getUserId();
        if (userId == null){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "사용자 정보를 찾을 수 없습니다."));
        }

        try{
            ChatMessageDto message=messageService.editMessage(messageId, request.getContent(), userId);

            List<Integer> targetUserId=message.getParticipantIds();
            for (Integer id:targetUserId){
                messagingTemplate.convertAndSendToUser(id.toString(),
                        "/queue/chat/room/" + message.getRoomId() + "/message/update", Map.of("result",message));
            }

            return ResponseEntity.ok(Map.of("result", message));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error","서버에 오류가 발생했습니다."));
        }
    }
}
