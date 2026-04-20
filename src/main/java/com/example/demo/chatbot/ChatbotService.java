package com.example.demo.chatbot;

import com.example.demo.chatbot.dto.request.DoctorScheduleInquiryRequest;
import com.example.demo.chatbot.dto.request.ReservationInquiryRequest;
import com.example.demo.chatbot.dto.response.*;
import com.example.demo.department.Department;
import com.example.demo.department.DepartmentRepository;
import com.example.demo.schedule.staff.entity.StaffSchedule;
import com.example.demo.schedule.staff.repository.StaffScheduleRepository;
import com.example.demo.slot.Slot;
import com.example.demo.slot.SlotRepository;
import com.example.demo.staff.Staff;
import com.example.demo.staff.StaffRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.endpoints.internal.Value;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatbotService {
    private final DepartmentRepository departmentRepository;
    private final StaffRepository staffRepository;
    private final SlotRepository slotRepository;
    private final StaffScheduleRepository scheduleRepository;

    public ChatbotDepartmentResponse getDepartmentList() {
        List<ChatbotDepartmentDto> departmentList = departmentRepository.findByStatus("Y")
                .stream().map(d -> ChatbotDepartmentDto.builder()
                        .department(d.getDepartmentName())
                        .location(d.getLocation())
                        .build()).toList();

        return ChatbotDepartmentResponse.builder().departments(departmentList).build();
    }

    public ChatbotDepartmentDto getDepartmentInfo(String departmentName){
        Department department=departmentRepository.findByDepartmentName(departmentName)
                .orElseThrow(() -> new RuntimeException("존재하지 않는 진료과명입니다."));

        return ChatbotDepartmentDto.builder().department(department.getDepartmentName())
                .location(department.getLocation()).build();
    }

    public ChatbotDoctorResponse getDoctorsInDepartment(String departmentName){
        Department department=departmentRepository.findByDepartmentName(departmentName)
                .orElseThrow(() -> new RuntimeException("존재하지 않는 진료과명입니다."));

        List<Staff> staffList=staffRepository.findDoctorByDepartment(department);

        List<ChatbotDoctorDto> doctors=staffList.stream().map(s -> ChatbotDoctorDto.builder()
                .name(s.getName()).build()).toList();

        return ChatbotDoctorResponse.builder().department(departmentName).doctors(doctors).build();
    }

    public ChatbotReservationResponse getReservationStatus(ReservationInquiryRequest request){
        String departmentName=request.getDepartment();
        if (departmentName == null || departmentName.isBlank()) {
            throw new RuntimeException("진료과명이 포함되지 않은 질문입니다.");
        }

        boolean hasDate = request.getDate() != null && !request.getDate().isBlank();
        boolean hasRange = request.getStartDate() != null && !request.getStartDate().isBlank()
                && request.getEndDate() != null && !request.getEndDate().isBlank();

        if (!hasDate && !hasRange) {
            throw new RuntimeException("날짜 정보가 포함되지 않은 질문입니다.");
        }

        if (hasDate && hasRange) {
            throw new RuntimeException("단일 날짜와 기간 날짜가 동시에 들어왔습니다.");
        }

        if (hasRange) {
            LocalDate localStart = LocalDate.parse(request.getStartDate());
            LocalDate localEnd = LocalDate.parse(request.getEndDate());

            if (localStart.isAfter(localEnd)) {
                throw new RuntimeException("시작일이 종료일보다 늦습니다.");
            }
        }

        Department department = departmentRepository.findByDepartmentName(departmentName)
                .orElseThrow(() -> new RuntimeException("존재하지 않는 진료과명입니다."));

        List<Staff> doctors = staffRepository.findDoctorByDepartment(department);

        if (hasDate){
            LocalDate date=LocalDate.parse(request.getDate());
            return getSingleDateReservationStatus(departmentName, department, doctors, date);
        }

        return getRangeReservationStatus(departmentName, department, doctors,
                LocalDate.parse(request.getStartDate()), LocalDate.parse(request.getEndDate()));
    }

    private ChatbotReservationResponse getSingleDateReservationStatus(String departmentName, Department department,
                                                                      List<Staff> doctors, LocalDate date){
        LocalDateTime start=date.atStartOfDay();
        LocalDateTime end=date.plusDays(1).atStartOfDay();

        List<StaffSchedule> schedules=
                scheduleRepository.findByStatusAndStaffScheduleType_ScheduleTypeIdAndWorkDateAndStaffIn(
                        "CONFIRMED", 1, date, doctors
                );

        boolean schedulePublished;

        if (date.equals(LocalDate.now())){
            schedulePublished=true;
        } else {
            schedulePublished=schedules != null && !schedules.isEmpty();
        }

        int totalCount;

        if (schedules == null || schedules.isEmpty()){
            totalCount =3 * 8 * doctors.size();
        } else {
            totalCount=3 * 8 * schedules.size();
        }

        List<Slot> slots=
                slotRepository.findByDepartmentAndStartTimeGreaterThanEqualAndStartTimeLessThan(
                        department, start, end
                );

        int currentCount=sumCurrentPatients(slots);
        int availableCount=Math.max(totalCount - currentCount, 0);

        return ChatbotReservationResponse.builder()
                .department(departmentName)
                .date(String.valueOf(date))
                .totalCount(totalCount)
                .availableCount(availableCount)
                .schedulePublished(schedulePublished)
                .build();
    }

    private ChatbotReservationResponse getRangeReservationStatus(String departmentName, Department department,
                                                                 List<Staff> doctors, LocalDate startDate, LocalDate endDate){
        LocalDateTime start=startDate.atStartOfDay();
        LocalDateTime end=endDate.plusDays(1).atStartOfDay();

        long days=ChronoUnit.DAYS.between(startDate, endDate) + 1;

        List<StaffSchedule> schedules=
                scheduleRepository.findByStatusAndStaffScheduleType_ScheduleTypeIdAndWorkDateBetweenAndStaffIn(
                        "CONFIRMED", 1, startDate, endDate, doctors
                );

        List<StaffSchedule> safeSchedules=schedules == null ? Collections.emptyList() : schedules;

        Set<LocalDate> confirmedDates=safeSchedules.stream()
                .map(StaffSchedule::getWorkDate)
                .collect(Collectors.toSet());

        boolean schedulePublished=true;

        for (int i=0; i<days; i++){
            LocalDate currentDate=startDate.plusDays(i);

            if (!confirmedDates.contains(currentDate)){
                schedulePublished=false;
                break;
            }
        }

        int totalCount;
        if (safeSchedules.isEmpty()){
            totalCount=(int) ((3 * 8 * doctors.size()) * days);
        } else {
            totalCount=3 * 8 * safeSchedules.size();
        }

        List<Slot> slots=
                slotRepository.findByDepartmentAndStartTimeGreaterThanEqualAndStartTimeLessThan(
                        department, start, end
                );

        int currentCount=sumCurrentPatients(slots);
        int availableCount=Math.max(totalCount - currentCount, 0);

        return ChatbotReservationResponse.builder()
                .department(departmentName)
                .startDate(String.valueOf(startDate))
                .endDate(String.valueOf(endDate))
                .totalCount(totalCount)
                .availableCount(availableCount)
                .schedulePublished(schedulePublished)
                .build();
    }

    private int sumCurrentPatients(List<Slot> slots){
        if (slots == null || slots.isEmpty()){
            return 0;
        }

        int sum=0;
        for (Slot slot:slots){
            sum += slot.getCurrentPatient();
        }

        return sum;
    }

    public ChatbotDoctorScheduleResponse getDoctorSchedule(DoctorScheduleInquiryRequest request){
        String doctorName= request.getDoctorName();
        if (doctorName == null || doctorName.isBlank()) {
            throw new RuntimeException("의사 이름이 포함되지 않은 질문입니다.");
        }

        String departmentName = request.getDepartment();
        if (departmentName == null || departmentName.isBlank()) {
            throw new RuntimeException("진료과명이 포함되지 않은 질문입니다.");
        }

        boolean hasDate = request.getDate() != null && !request.getDate().isBlank();
        boolean hasRange = request.getStartDate() != null && !request.getStartDate().isBlank()
                && request.getEndDate() != null && !request.getEndDate().isBlank();

        if (!hasDate && !hasRange) {
            throw new RuntimeException("날짜 정보가 포함되지 않은 질문입니다.");
        }

        if (hasDate && hasRange) {
            throw new RuntimeException("단일 날짜와 기간 날짜가 동시에 들어왔습니다.");
        }

        if (hasRange) {
            LocalDate startDate = LocalDate.parse(request.getStartDate());
            LocalDate endDate = LocalDate.parse(request.getEndDate());

            if (startDate.isAfter(endDate)) {
                throw new RuntimeException("시작일이 종료일보다 늦습니다.");
            }
        }

        Department department = departmentRepository.findByDepartmentName(departmentName)
                .orElseThrow(() -> new RuntimeException("존재하지 않는 진료과입니다."));

        Staff doctor = staffRepository.findByDepartmentAndName(department, doctorName)
                .orElseThrow(() -> new RuntimeException("존재하지 않는 의사입니다."));

        List<String> times = List.of("09", "10", "11", "12", "14", "15", "16", "17");

        if (hasDate) {
            return getSingleDateDoctorSchedule(request, departmentName, department, doctorName, doctor, times);
        }

        return getRangeDoctorSchedule(request, departmentName, department, doctorName, doctor, times);
    }

    private ChatbotDoctorScheduleResponse getSingleDateDoctorSchedule(DoctorScheduleInquiryRequest request,
                                                                      String departmentName, Department department,
                                                                      String doctorName, Staff doctor, List<String> times){
        LocalDate date=LocalDate.parse(request.getDate());

        boolean hasConfirmedDaySchedule=isConfirmedDaySchedule(doctor, date);

        //오늘인데 day 근무 스케쥴이 없으면 이미 다른 근무로 확정된 상태
        if (!hasConfirmedDaySchedule && date.equals(LocalDate.now())){
            return ChatbotDoctorScheduleResponse.builder()
                    .department(departmentName)
                    .doctorName(doctorName)
                    .date(request.getDate())
                    .available(false)
                    .schedules(null)
                    .schedulePublished(true)
                    .build();
        }

        List<ChatbotDoctorScheduleDto> schedules=
                buildAvailableSchedulesForDate(department, doctor, date, times);

        return ChatbotDoctorScheduleResponse.builder()
                .department(departmentName)
                .doctorName(doctorName)
                .date(request.getDate())
                .available(!schedules.isEmpty())
                .schedules(schedules)
                .schedulePublished(hasConfirmedDaySchedule)
                .build();
    }

    private ChatbotDoctorScheduleResponse getRangeDoctorSchedule(DoctorScheduleInquiryRequest request,
                                                                 String departmentName, Department department,
                                                                 String doctorName, Staff doctor, List<String> times){
        LocalDate startDate=LocalDate.parse(request.getStartDate());
        LocalDate endDate=LocalDate.parse(request.getEndDate());

        long days=ChronoUnit.DAYS.between(startDate, endDate) + 1;

        List<StaffSchedule> confirmedSchedules=
                scheduleRepository.findByStaffAndStatusAndStaffScheduleType_ScheduleTypeIdAndWorkDateBetween(
                        doctor, "CONFIRMED", 1, startDate, endDate
                );

        Set<LocalDate> confirmedDates=confirmedSchedules == null
                ? new HashSet<>()
                : confirmedSchedules.stream()
                    .map(StaffSchedule::getWorkDate)
                    .collect(Collectors.toSet());

        boolean schedulePublished=true;
        List<ChatbotDoctorScheduleDto> resultSchedules=new ArrayList<>();

        for (int i=0; i<days; i++){
            LocalDate currentDate=startDate.plusDays(i);

            if (!confirmedDates.contains(currentDate)){
                schedulePublished=false;
            }

            List<ChatbotDoctorScheduleDto> daySchedules=
                    buildAvailableSchedulesForDate(department, doctor, currentDate, times);

            resultSchedules.addAll(daySchedules);
        }

        return ChatbotDoctorScheduleResponse.builder()
                .department(departmentName)
                .doctorName(doctorName)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .available(!resultSchedules.isEmpty())
                .schedules(resultSchedules)
                .schedulePublished(schedulePublished)
                .build();
    }

    private boolean isConfirmedDaySchedule(Staff doctor, LocalDate date){
        StaffSchedule schedule=
                scheduleRepository.findByStaffAndStatusAndStaffScheduleType_ScheduleTypeIdAndWorkDate(
                        doctor, "CONFIRMED", 1, date
                );

        return schedule != null;
    }

    private List<ChatbotDoctorScheduleDto> buildAvailableSchedulesForDate(Department department, Staff doctor,
                                                                          LocalDate date, List<String> times){
        LocalDateTime start=date.atStartOfDay();
        LocalDateTime end=date.plusDays(1).atStartOfDay();

        List<Slot> slots=
                slotRepository.findByDepartmentAndStaffAndStartTimeGreaterThanEqualAndStartTimeLessThan(
                        department, doctor, start, end
                );

        Set<Integer> fullHours=new HashSet<>();
        if (slots != null && !slots.isEmpty()){
            fullHours=slots.stream()
                    .filter(slot -> slot.getCurrentPatient() == slot.getMaxPatient())
                    .map(slot -> slot.getStartTime().getHour())
                    .collect(Collectors.toSet());
        }

        List<ChatbotDoctorScheduleDto> result=new ArrayList<>();

        for (String time:times){
            int hour=Integer.parseInt(time);

            if (!fullHours.contains(hour)){
                result.add(ChatbotDoctorScheduleDto.builder()
                        .date(String.valueOf(date))
                        .time(time + ":00:00")
                        .build());
            }
        }

        return result;
    }
}
