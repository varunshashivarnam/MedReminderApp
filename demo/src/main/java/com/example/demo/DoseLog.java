package com.example.demo;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** One scheduled dose outcome: the source of truth for history, calendar and analytics. */
@Entity
@Table(indexes = @Index(columnList = "date"))
public class DoseLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long medicationId;
    private String medName;
    private String dosage;
    private LocalDate date;
    private String time;      // scheduled HH:mm
    private String status;    // TAKEN, MISSED, SKIPPED
    private LocalDateTime at; // when it was actually recorded

    public DoseLog() {
    }

    public DoseLog(Long medicationId, String medName, String dosage, LocalDate date, String time, String status, LocalDateTime at) {
        this.medicationId = medicationId;
        this.medName = medName;
        this.dosage = dosage;
        this.date = date;
        this.time = time;
        this.status = status;
        this.at = at;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getMedicationId() { return medicationId; }
    public void setMedicationId(Long medicationId) { this.medicationId = medicationId; }
    public String getMedName() { return medName; }
    public void setMedName(String medName) { this.medName = medName; }
    public String getDosage() { return dosage; }
    public void setDosage(String dosage) { this.dosage = dosage; }
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }
    public String getTime() { return time; }
    public void setTime(String time) { this.time = time; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getAt() { return at; }
    public void setAt(LocalDateTime at) { this.at = at; }
}
