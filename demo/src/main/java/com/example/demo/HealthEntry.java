package com.example.demo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

import java.time.LocalDateTime;

@Entity
public class HealthEntry {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String type;   // bp, sugar, weight, heart, mood, sleep, water, symptom
    @Column(name = "entry_value") // "value" is a reserved word in H2
    private String value;  // e.g. "120/80", "72", "8"
    private String unit;   // mmHg, mg/dL, kg, bpm, /10, h, glasses, text
    @Column(length = 500)
    private String note;
    private LocalDateTime at;

    public HealthEntry() {
    }

    public HealthEntry(String type, String value, String unit, String note, LocalDateTime at) {
        this.type = type;
        this.value = value;
        this.unit = unit;
        this.note = note;
        this.at = at;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getValue() { return value; }
    public void setValue(String value) { this.value = value; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public LocalDateTime getAt() { return at; }
    public void setAt(LocalDateTime at) { this.at = at; }
}
