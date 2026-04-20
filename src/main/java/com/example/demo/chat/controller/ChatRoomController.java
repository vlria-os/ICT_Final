package com.example.demo.chat.controller;

import com.example.demo.chat.dto.*;
import com.example.demo.chat.service.ChatMessageService;
import com.example.demo.chat.service.ChatRoomService;
import com.example.demo.security.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class ChatRoomController {
    private final ChatRoomService roomService;
    private final ChatMessageService messageService;

    @GetMapping("/chat/room/list")
    public ResponseEntity<Map<String,Object>> chatRoomList(@AuthenticationPrincipal CustomUserDetails details){
        if (details == null){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error","사용자 정보가 존재하지 않습니다."));
        }

        Integer userId=details.getUserId();
        if (userId == null){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error","사용자 정보를 읽을 수 없습니다."));
        }

        try{
            List<ChatRoomDto> list=roomService.chatRoomList(userId);
            return ResponseEntity.ok(Map.of("result", list));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error","서버에 오류가 발생했습니다."));
        }
    }

    @GetMapping("/chat/room/{roomId}")
    public ResponseEntity<Map<String,Object>> chatRoomDetail(@PathVariable Integer roomId,
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
            ChatRoomDto chatRoom=roomService.getChatRoom(roomId, userId);
            List<ChatRoomParticipantDto> participants=roomService.getParticipantInfo(roomId, userId);

            int size=20;
            MessageSlice messages=messageService.getMessages(roomId, cursor, size, userId);

            ChatRoomDetailResponse response=new ChatRoomDetailResponse(chatRoom, participants, messages);

            return ResponseEntity.ok(Map.of("result", response));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error","서버에 오류가 발생했습니다."));
        }
    }

    @PostMapping("/chat/read/{roomId}")
    public ResponseEntity<Map<String,Object>> markAsRead(@PathVariable Integer roomId,
                                                         @AuthenticationPrincipal CustomUserDetails details){
        if (details == null){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error","사용자 정보가 존재하지 않습니다."));
        }

        Integer userId=details.getUserId();
        if (userId == null){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error","사용자 정보를 읽을 수 없습니다."));
        }

        try{
            roomService.markAsRead(roomId, userId);
            return ResponseEntity.ok(Map.of("result","success"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error","서버에 오류가 발생했습니다."));
        }
    }

    @PostMapping("/chat/room")
    public ResponseEntity<Map<String, Object>> createChatRoom(@RequestBody CreateChatRoomRequest request,
                                            @AuthenticationPrincipal CustomUserDetails details){
        if (details == null){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error","사용자 정보가 존재하지 않습니다."));
        }

        Integer userId=details.getUserId();
        if (userId == null){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error","사용자 정보를 읽을 수 없습니다."));
        }

        try{
            ChatRoomDto room=roomService.createChatRoom(userId, request);
            return ResponseEntity.ok(Map.of("result", room));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error","서버에 오류가 발생했습니다."));
        }
    }

    @GetMapping("/chat/staff/list")
    public ResponseEntity<Map<String,Object>> getStaffList(@AuthenticationPrincipal CustomUserDetails details,
                                          @RequestParam(name = "keyword", required = false) String keyword){
        if (details == null){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error","사용자 정보가 존재하지 않습니다."));
        }

        Integer userId=details.getUserId();
        if (userId == null){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error","사용자 정보를 읽을 수 없습니다."));
        }

        try{
            List<GetStaffListResponse> responses=roomService.getStaffList(userId, keyword);
            return ResponseEntity.ok(Map.of("result", responses));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error","서버에 오류가 발생했습니다."));
        }
    }

    @GetMapping("/chat/room/{roomId}/invite/staff")
    public ResponseEntity<Map<String, Object>> getStaffListForInvite(@PathVariable Integer roomId,
                                                   @AuthenticationPrincipal CustomUserDetails details){
        if (details == null){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error","사용자 정보가 존재하지 않습니다."));
        }

        Integer userId=details.getUserId();
        if (userId == null){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error","사용자 정보를 읽을 수 없습니다."));
        }

        try{
            List<GetStaffListResponse> responses=roomService.getStaffListForInvite(roomId, userId);
            return ResponseEntity.ok(Map.of("result", responses));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error","서버에 오류가 발생했습니다."));
        }
    }

    @PostMapping("/chat/room/{roomId}/invite")
    public ResponseEntity<Map<String,Object>> inviteStaff(@PathVariable Integer roomId,
                                         @RequestBody List<Integer> staffIds,
                                         @AuthenticationPrincipal CustomUserDetails details){
        if (details == null){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error","사용자 정보가 존재하지 않습니다."));
        }

        Integer userId=details.getUserId();
        if (userId == null){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error","사용자 정보를 읽을 수 없습니다."));
        }

        try{
            List<Integer> response=roomService.inviteStaff(roomId, userId, staffIds);
            return ResponseEntity.ok(Map.of("result", response));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error","서버에 오류가 발생했습니다."));
        }
    }

    @DeleteMapping("/chat/room/{roomId}/leave")
    public ResponseEntity<Map<String,Object>> leaveChatRoom(@PathVariable Integer roomId,
                                           @AuthenticationPrincipal CustomUserDetails details){
        if (details == null){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error","사용자 정보가 존재하지 않습니다."));
        }

        Integer userId=details.getUserId();
        if (userId == null){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error","사용자 정보를 읽을 수 없습니다."));
        }

        try{
            LeaveChatRoomResponse response=roomService.leaveChatRoom(roomId, userId);
            return ResponseEntity.ok(Map.of("result", response));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error","서버에 오류가 발생했습니다."));
        }
    }
}
