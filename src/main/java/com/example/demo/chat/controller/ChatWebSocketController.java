package com.example.demo.chat.controller;

import com.example.demo.chat.dto.ChatMessageDto;
import com.example.demo.chat.dto.SendMessageRequest;
import com.example.demo.chat.dto.UpdateMessageRequest;
import com.example.demo.chat.entity.ChatMessage;
import com.example.demo.chat.service.ChatMessageService;
import com.example.demo.security.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Controller
@RequiredArgsConstructor
public class ChatWebSocketController {
    private final ChatMessageService messageService;
    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/chat/send/user")
    public void sendUserMessage(@Payload SendMessageRequest request,
                                Principal principal){
        System.out.println("CONTROLLER PRINCIPAL ==> " + principal);

        if (principal == null) {
            throw new RuntimeException("로그인 후 이용하세요.");
        }

        Authentication authentication = (Authentication) principal;
        CustomUserDetails details = (CustomUserDetails) authentication.getPrincipal();

        Integer userId = details.getUserId();
        if (userId == null) {
            throw new RuntimeException("사용자 정보를 찾을 수 없습니다.");
        }

        ChatMessageDto saveMessage=messageService.sendChatMessage(request, userId);

        //채팅방 안 메시지 실시간 전송
        messagingTemplate.convertAndSend("/topic/chat/room/" + request.getRoomId(), saveMessage);

        List<Integer> targetUserIds=saveMessage.getParticipantIds();
        for (Integer id : targetUserIds){
            messagingTemplate.convertAndSendToUser(
                    id.toString(),
                    "/queue/chat/list",
                    Map.of("type", "ROOM_LIST_REFRESH")
            );
        }
    }
}
