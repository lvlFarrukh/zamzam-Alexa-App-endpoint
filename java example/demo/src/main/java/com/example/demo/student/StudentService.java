package com.example.demo.student;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import javax.transaction.Transactional;
import java.time.LocalDate;
import java.time.Month;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
public class StudentService {

    private final StudentRepository studentRepository;

    @Autowired
    public StudentService(StudentRepository studentRepository) {
        this.studentRepository = studentRepository;
    }

    //add new student
    public void addNewStudent(Student student) {
        Optional<Student> studentByEmail = studentRepository.findStudentByEmail(student.getEmail());
        if (studentByEmail.isPresent()) {
            throw new IllegalStateException("email already taken");
        }
        else{
            studentRepository.save(student);
        }
        System.out.println(student);

    }

    public List<Student> getStudent() {
        return studentRepository.findAll();
    }

    public void deleteStudentById(Long studentId) {
        Boolean exists = studentRepository.existsById(studentId);
        if (!exists) {
            throw new IllegalStateException(
                    "Student with this id: " + studentId + " is not exists."
            );
        }
        else {
            studentRepository.deleteById(studentId);
        }
    }

    @Transactional // learning Remaining
    public void updateStudentData(
            Long studentId,
            String email,
            String name
    ) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(()-> new IllegalStateException("No Student exist with " +studentId+ " this id."));

        if (
                name != null &&
                name.length() > 0 &&
                !Objects.equals(student.getName(), name)
        ) {
            student.setName(name);
        }

        if (
                email != null &&
                email.length() > 0 &&
                !Objects.equals(student.getEmail(), email)
        ) {
            Optional<Student> studentByEmail = studentRepository.findStudentByEmail(email);
            if (studentByEmail.isPresent()) {
                throw new IllegalStateException("email already taken");
            }
            else {
                student.setEmail(email);
            }
        }
    }
}
