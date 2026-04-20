//package com.example.demo.join;
//
//import com.example.demo.join.dto.PatientUserRequest;
//import lombok.Getter;
//import lombok.RequiredArgsConstructor;
//import org.springframework.http.HttpStatus;
//import org.springframework.http.ResponseEntity;
//import org.springframework.web.bind.annotation.*;
//
//@RestController
//@RequiredArgsConstructor
//public class JoinController {
//    private final JoinService joinService;
//
//    @GetMapping("/join/check/email")
//    public ResponseEntity<String> emailCheck(@RequestParam("email") String email){
//        try{
//            String result= joinService.emailCheck(email);
//            return ResponseEntity.ok(result);
//        } catch (Exception e) {
//            e.printStackTrace();
//            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
//        }
//    }
//
//    @GetMapping("/join/check/rrn")
//    public ResponseEntity<String> rrnCheck(@RequestParam("rrn") String rrn){
//        try{
//            String result= joinService.rrnCheck(rrn);
//            return ResponseEntity.ok(result);
//        } catch (Exception e) {
//            e.printStackTrace();
//            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
//        }
//    }
//
//    @PostMapping("/join")
//    public ResponseEntity<String> join(@RequestBody PatientUserRequest request){
//        try{
//            String result= joinService.join(request);
//            return ResponseEntity.ok(result);
//        } catch (Exception e) {
//            e.printStackTrace();
//            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
//        }
//    }
//}
