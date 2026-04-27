package com.example.demo.schedule.staff.dto;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StaffScheduleDto {
    private Integer scheduleId;
    private Integer staffId;
    private String staffName;
    private LocalDate workDate;
    private LocalTime startTime;
    private Integer scheduleTypeId;
    private String typeCode;
    private String typeName;
    private String status;
    private Integer departmentId;
    private String departmentName;
}
