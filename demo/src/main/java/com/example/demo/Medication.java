package com.example.demo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
public class Medication {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String dosage;
    private String time;         // HH:mm (24h), blank if not scheduled at a fixed time
    private String frequency;    // Daily, Weekly, As needed
    @Column(length = 1000)
    private String instructions;
    private boolean taken;
    private LocalDateTime takenAt;

    // Extended details
    private String category;     // Heart, Diabetes, Skincare, Pain Relief, Supplement, Other
    private String color;        // hex accent used in the UI
    @Column(length = 2000)
    private String notes;
    private String doctor;
    private String pharmacy;
    private String rxNumber;
    private LocalDate startDate;
    private LocalDate endDate;
    private boolean withFood;
    private boolean beforeBed;

    // Inventory
    private Integer pillsRemaining;  // null = not tracked
    private Integer pillsPerDose;    // defaults to 1 when tracked

    public Medication() {
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDosage() { return dosage; }
    public void setDosage(String dosage) { this.dosage = dosage; }

    public String getTime() { return time; }
    public void setTime(String time) { this.time = time; }

    public String getFrequency() { return frequency; }
    public void setFrequency(String frequency) { this.frequency = frequency; }

    public String getInstructions() { return instructions; }
    public void setInstructions(String instructions) { this.instructions = instructions; }

    public boolean isTaken() { return taken; }
    public void setTaken(boolean taken) { this.taken = taken; }

    public LocalDateTime getTakenAt() { return takenAt; }
    public void setTakenAt(LocalDateTime takenAt) { this.takenAt = takenAt; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getDoctor() { return doctor; }
    public void setDoctor(String doctor) { this.doctor = doctor; }

    public String getPharmacy() { return pharmacy; }
    public void setPharmacy(String pharmacy) { this.pharmacy = pharmacy; }

    public String getRxNumber() { return rxNumber; }
    public void setRxNumber(String rxNumber) { this.rxNumber = rxNumber; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }

    public boolean isWithFood() { return withFood; }
    public void setWithFood(boolean withFood) { this.withFood = withFood; }

    public boolean isBeforeBed() { return beforeBed; }
    public void setBeforeBed(boolean beforeBed) { this.beforeBed = beforeBed; }

    public Integer getPillsRemaining() { return pillsRemaining; }
    public void setPillsRemaining(Integer pillsRemaining) { this.pillsRemaining = pillsRemaining; }

    public Integer getPillsPerDose() { return pillsPerDose; }
    public void setPillsPerDose(Integer pillsPerDose) { this.pillsPerDose = pillsPerDose; }

    public boolean isScheduledDaily() {
        return "Daily".equalsIgnoreCase(frequency) && time != null && !time.isBlank();
    }

    /** Pills consumed per day, used for refill estimates. */
    public double pillsPerDay() {
        int perDose = pillsPerDose == null || pillsPerDose < 1 ? 1 : pillsPerDose;
        if (isScheduledDaily()) return perDose;
        if ("Weekly".equalsIgnoreCase(frequency)) return perDose / 7.0;
        return 0; // as-needed: no reliable estimate
    }
}
