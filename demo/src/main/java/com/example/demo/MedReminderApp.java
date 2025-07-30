package com.example.demo;


/**
 * Write a description of class ReminderGUI here.
 *
 * @author (your name)
 * @version (a version number or a date)
 */
import javax.swing.*;
import java.awt.*;
import java.awt.event.*;

public class MedReminderApp extends JFrame {
	private Timer timer;
	private JTextField medNameField;
	private JTextField doseField;
	private JTextField minutesField;
	private JButton startButton;

	public MedReminderApp() {
		setTitle("Medication Reminder");
		setSize(350, 200);
		setDefaultCloseOperation(EXIT_ON_CLOSE);
		setLayout(new FlowLayout());

		add(new JLabel("Medication Name:"));
		medNameField = new JTextField(15);
		add(medNameField);

		add(new JLabel("Dose (e.g., 1 pill):"));
		doseField = new JTextField(10);
		add(doseField);

		add(new JLabel("Remind me in (minutes):"));
		minutesField = new JTextField(10);
		add(minutesField);

		startButton = new JButton("Start Reminder");
		add(startButton);

		startButton.addActionListener (new ActionListener() {
			public void actionPerformed(ActionEvent e) {
				String medName = medNameField.getText().trim();
				String dose = doseField.getText().trim();
				String minutesText = minutesField.getText().trim();

				if (medName.isEmpty() || dose.isEmpty() || minutesText.isEmpty()) {
					JOptionPane.showMessageDialog(null, "Please fill out all fields.");
					return;
				}

				int minutes = 0;
				try {
					minutes = Integer.parseInt(minutesText);
					if (minutes <= 0) {
						JOptionPane.showMessageDialog(null, "Please enter a positive number for minutes.");
						return;
					}
				} catch (NumberFormatException ex) {
					JOptionPane.showMessageDialog(null, "Please enter a valid number for minutes.");
					return;
				}

				int delayMillis = minutes * 60 * 1000;

				timer = new Timer(delayMillis, new ActionListener() {
					public void actionPerformed(ActionEvent e) {
						JOptionPane.showMessageDialog(null,
								"Time to take " + dose + " of " + medName + " now!");
						timer.stop();
					}
				});

				timer.setRepeats(false);
				timer.start();

				JOptionPane.showMessageDialog(null,
						"Reminder set to take " + dose + " of " + medName + " in " + minutes + " minute(s).");
			}
		});

		setVisible(true);
	}

	public static void main(String[] args) {
		new MedReminderApp();
	}
}
