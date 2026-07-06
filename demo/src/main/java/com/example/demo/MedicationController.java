package com.example.demo;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class MedicationController {

    private final MedicationService service;

    public MedicationController(MedicationService service) {
        this.service = service;
    }

    // ---------- Medications ----------

    @GetMapping("/medications")
    public List<Medication> list() {
        return service.findAll();
    }

    @GetMapping("/medications/{id}")
    public ResponseEntity<Medication> get(@PathVariable long id) {
        return service.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/medications")
    public ResponseEntity<?> create(@RequestBody Medication med) {
        String error = validate(med);
        if (error != null) {
            return ResponseEntity.badRequest().body(Map.of("error", error));
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(med));
    }

    @PutMapping("/medications/{id}")
    public ResponseEntity<?> update(@PathVariable long id, @RequestBody Medication med) {
        String error = validate(med);
        if (error != null) {
            return ResponseEntity.badRequest().body(Map.of("error", error));
        }
        return service.update(id, med)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/medications/{id}")
    public ResponseEntity<Void> delete(@PathVariable long id) {
        return service.delete(id) ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    @PostMapping("/medications/{id}/take")
    public ResponseEntity<Medication> take(@PathVariable long id,
                                           @RequestParam(defaultValue = "true") boolean taken) {
        return service.setTaken(id, taken)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/medications/{id}/skip")
    public ResponseEntity<Medication> skip(@PathVariable long id) {
        return service.skipToday(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // ---------- Dashboard data ----------

    @GetMapping("/stats")
    public Map<String, Object> stats() {
        return service.stats();
    }

    @GetMapping("/activity")
    public List<ActivityEvent> activity() {
        return service.recentActivity();
    }

    @GetMapping("/adherence")
    public List<Map<String, Object>> adherence(@RequestParam(defaultValue = "14") int days) {
        return service.adherenceSeries(Math.max(1, Math.min(days, 120)));
    }

    @GetMapping("/analytics")
    public Map<String, Object> analytics(@RequestParam(defaultValue = "90") int days) {
        return service.analytics(Math.max(7, Math.min(days, 365)));
    }

    @GetMapping("/doses")
    public List<Map<String, Object>> doses(@RequestParam String date) {
        return service.dayHistory(LocalDate.parse(date));
    }

    @GetMapping("/notifications")
    public List<Map<String, Object>> notifications() {
        return service.notifications();
    }

    @GetMapping("/achievements")
    public List<Map<String, Object>> achievements() {
        return service.achievementList();
    }

    @GetMapping("/export")
    public Map<String, Object> export() {
        return service.exportAll();
    }

    // ---------- Health tracking ----------

    @GetMapping("/health")
    public List<HealthEntry> health() {
        return service.healthEntries();
    }

    @PostMapping("/health")
    public ResponseEntity<?> addHealth(@RequestBody HealthEntry entry) {
        if (entry.getType() == null || entry.getType().isBlank()
                || entry.getValue() == null || entry.getValue().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Type and value are required."));
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(service.addHealth(entry));
    }

    @DeleteMapping("/health/{id}")
    public ResponseEntity<Void> deleteHealth(@PathVariable long id) {
        return service.deleteHealth(id) ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    // Kept for backwards compatibility with the original health log form.
    @PostMapping("/activity/log")
    public ResponseEntity<Void> logHealthData(@RequestBody Map<String, String> body) {
        String message = body.getOrDefault("message", "").trim();
        if (message.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        service.logActivity(message, "Logged");
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    // ---------- Validation ----------

    private String validate(Medication med) {
        if (med.getName() == null || med.getName().isBlank()) {
            return "Medication name is required.";
        }
        if (med.getName().length() > 120) {
            return "Medication name is too long.";
        }
        if (med.getDosage() == null || med.getDosage().isBlank()) {
            return "Dosage is required.";
        }
        String freq = med.getFrequency();
        boolean daily = freq == null || freq.isBlank() || "Daily".equalsIgnoreCase(freq);
        String time = med.getTime();
        if (daily && (time == null || time.isBlank())) {
            return "A time is required for daily medications.";
        }
        if (time != null && !time.isBlank() && !time.matches("([01]\\d|2[0-3]):[0-5]\\d")) {
            return "Time must be in HH:MM format.";
        }
        if (med.getPillsRemaining() != null && med.getPillsRemaining() < 0) {
            return "Remaining pills can't be negative.";
        }
        if (med.getColor() != null && !med.getColor().isBlank() && !med.getColor().matches("#[0-9a-fA-F]{6}")) {
            return "Color must be a hex value like #2563eb.";
        }
        if (med.getStartDate() != null && med.getEndDate() != null && med.getEndDate().isBefore(med.getStartDate())) {
            return "End date can't be before the start date.";
        }
        return null;
    }
}
