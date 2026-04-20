package com.example.demo.chatbot;

import com.example.demo.chatbot.dto.request.DoctorInquiryRequest;
import com.example.demo.chatbot.dto.request.DoctorScheduleInquiryRequest;
import com.example.demo.chatbot.dto.request.ReservationInquiryRequest;
import com.example.demo.chatbot.dto.response.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/chatbot/inquiry")
public class ChatbotController {
    @Value("${chatbot.internal.api-key}")
    private String internalApiKey;

    private final ChatbotService chatbotService;

    private void validateInternalApiKey(String apiKey){
        if (apiKey == null || apiKey.isBlank() || !internalApiKey.equals(apiKey)){
            throw new RuntimeException("유효하지 않은 내부 API 키입니다.");
        }
    }

    @GetMapping("/reservation")
    public ResponseEntity<ChatbotReservationResponse> getReservationStatus(@RequestHeader("X-Internal-API-Key") String apiKey,
                                                                           @RequestParam("department") String department,
                                                                           @RequestParam(name = "date", required = false) String date,
                                                                           @RequestParam(name = "startDate", required = false) String startDate,
                                                                           @RequestParam(name = "endDate", required = false) String endDate){
        validateInternalApiKey(apiKey);

        ReservationInquiryRequest request=ReservationInquiryRequest.builder()
                .department(department)
                .date(date)
                .startDate(startDate)
                .endDate(endDate)
                .build();

        ChatbotReservationResponse response=chatbotService.getReservationStatus(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/doctor/schedule")
    public ResponseEntity<ChatbotDoctorScheduleResponse> getDoctorSchedule(@RequestHeader("X-Internal-API-Key") String apiKey,
                                                                           @RequestParam("department") String department,
                                                                           @RequestParam("doctorName") String doctorName,
                                                                           @RequestParam(name = "date", required = false) String date,
                                                                           @RequestParam(name = "startDate", required = false) String startDate,
                                                                           @RequestParam(name = "endDate", required = false) String endDate){
        validateInternalApiKey(apiKey);

        DoctorScheduleInquiryRequest request=DoctorScheduleInquiryRequest.builder()
                .department(department)
                .doctorName(doctorName)
                .date(date)
                .startDate(startDate)
                .endDate(endDate)
                .build();

        ChatbotDoctorScheduleResponse response=chatbotService.getDoctorSchedule(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/doctor")
    public ResponseEntity<ChatbotDoctorResponse> getDoctorsInfo(@RequestHeader("X-Internal-API-Key") String apiKey,
                                                               @RequestParam String department){
        validateInternalApiKey(apiKey);

        ChatbotDoctorResponse response=chatbotService.getDoctorsInDepartment(department);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/department")
    public ResponseEntity<ChatbotDepartmentDto> getDepartmentInfo(@RequestHeader("X-Internal-API-Key") String apiKey,
                                                                  @RequestParam("department") String department){
        validateInternalApiKey(apiKey);

        ChatbotDepartmentDto response=chatbotService.getDepartmentInfo(department);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/department/list")
    public ResponseEntity<ChatbotDepartmentResponse> getDepartmentList(@RequestHeader("X-Internal-API-Key") String apiKey){
        validateInternalApiKey(apiKey);

        ChatbotDepartmentResponse response=chatbotService.getDepartmentList();
        return ResponseEntity.ok(response);
    }
}
