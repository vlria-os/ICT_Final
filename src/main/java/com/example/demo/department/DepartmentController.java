package com.example.demo.department;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/department")
public class DepartmentController {
    private final DepartmentService departmentService;

    //등록
    @PostMapping("/register")
    public Integer register(@RequestBody DepartmentDto dto){
        return departmentService.register(dto);
    }
    //전체조회
    @GetMapping("/list")
    public List<DepartmentDto> selectAll(){
        return departmentService.selectAll();
    }
    //조회
    @GetMapping("/{departmentId}")
    public DepartmentDto selectOne(@PathVariable Integer departmentId){
        return departmentService.selectOne(departmentId);
    }
    //삭제
    @DeleteMapping("/{departmentId}")
    public String delete(@PathVariable Integer departmentId) {
        departmentService.delete(departmentId);
        return "삭제완료";
    }

    @GetMapping("")
    public Map<String,Object> getDepartment(){
        return departmentService.getDepartment();
    }

    @GetMapping("/by-category")
    public List<DepartmentDto> getByCategory(@RequestParam String category){
        return departmentService.getByCategory(category);
    }
    //수정
    @PutMapping("/{departmentId}")
    public DepartmentDto update(@PathVariable Integer departmentId,
                                @RequestBody DepartmentDto dto){
        return departmentService.update(departmentId, dto);
    }

}
