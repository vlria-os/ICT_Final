package com.example.demo.schedule.staff.controller;

import com.example.demo.schedule.staff.dto.BulkRegisterResultDto;
import com.example.demo.schedule.staff.dto.BulkStaffScheduleDto;
import com.example.demo.schedule.staff.dto.StaffScheduleDto;
import com.example.demo.schedule.staff.service.StaffScheduleService;
import com.example.demo.security.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/staff_schedule")
public class StaffScheduleController {
    private final StaffScheduleService staffScheduleService;

    @PreAuthorize("hasAnyRole('DOCTOR', 'NURSE')")
    @GetMapping("/my")
    public Page<StaffScheduleDto> getMySchedule(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) LocalDate startDate,
            @RequestParam(required = false) LocalDate endDate,
            @PageableDefault(size = 30, sort = "workDate", direction = Sort.Direction.ASC) Pageable pageable) {
        return staffScheduleService.getMySchedule(userDetails.getUserId(), startDate, endDate, pageable);
    }

    @PostMapping("/register")
    public Integer register(@RequestBody StaffScheduleDto dto){
        return staffScheduleService.register(dto);
    }

    @GetMapping("/list")
    public Page<StaffScheduleDto> selectAll(
            @RequestParam(required = false) Integer staffId,
            @RequestParam(required = false) LocalDate startDate,
            @RequestParam(required = false) LocalDate endDate,
            @PageableDefault(size = 10, sort = "workDate", direction = Sort.Direction.DESC) Pageable pageable){
        return staffScheduleService.selectAll(staffId, startDate, endDate, pageable);
    }

    @GetMapping("/{scheduleId}")
    public StaffScheduleDto selectOne(@PathVariable Integer scheduleId){
        return staffScheduleService.selectOne(scheduleId);
    }

    @PutMapping("/{scheduleId}")
    public StaffScheduleDto update(@PathVariable Integer scheduleId,
                                   @RequestBody StaffScheduleDto dto){
        return staffScheduleService.update(scheduleId, dto);
    }

    @DeleteMapping("/{scheduleId}")
    public String delete(@PathVariable Integer scheduleId){
        staffScheduleService.delete(scheduleId);
        return "삭제완료";
    }
//개별스케줄 확정
    @PutMapping("/{scheduleId}/confirm")
    public ResponseEntity<?> confirm(@PathVariable Integer scheduleId) {
        staffScheduleService.confirm(scheduleId);
        return ResponseEntity.ok().build();
    }

    //선택 스케줄 일괄 확정
    @PutMapping("/confirm/bulk")
    public ResponseEntity<?> bulkConfirm(@RequestBody List<Integer> scheduleIds){
        staffScheduleService.bulkConfirm(scheduleIds);
        return ResponseEntity.ok().build();
    }

    //다른직원 같은 스케줄 일괄등록
    @PostMapping("/bulk_register")
    public ResponseEntity<BulkRegisterResultDto> bulkRegister(@RequestBody  BulkStaffScheduleDto dto){
        BulkRegisterResultDto result= staffScheduleService.bulkRegister(dto);
        return ResponseEntity.ok(result);
    }
}
