package com.example.demo.schedule.aiSchedule.dto;

import lombok.*;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
// 프론트가 미리보기 확인 후 저장 요청할 때 사용
public class ConfirmScheduleRequestDto {
    private List<Map<String, Object>> assignments;
    private Integer departmentId;
}
