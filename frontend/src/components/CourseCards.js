import React from 'react';

const COURSES = [
  {
    id: 'ml',
    name: 'Machine Learning',
    icon: '🤖',
    desc: 'Algorithms, models & data-driven intelligence',
    gradient: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
  },
  {
    id: 'cv',
    name: 'Computer Vision',
    icon: '👁️',
    desc: 'Image understanding, detection & segmentation',
    gradient: 'linear-gradient(90deg, #06b6d4, #6366f1)',
  },
  {
    id: 'bd',
    name: 'Big Data',
    icon: '📊',
    desc: 'Distributed processing, analytics & pipelines',
    gradient: 'linear-gradient(90deg, #10b981, #06b6d4)',
  },
];

function CourseCards({ onSelect }) {
  return (
    <div className="courses-grid">
      {COURSES.map((course) => (
        <button
          key={course.id}
          id={`course-${course.id}`}
          className="course-card"
          style={{ '--gradient': course.gradient }}
          onClick={() => onSelect(course.name)}
        >
          <span className="course-icon">{course.icon}</span>
          <div className="course-name">{course.name}</div>
          <div className="course-desc">{course.desc}</div>
          <div className="course-arrow">Mark Attendance →</div>
        </button>
      ))}
    </div>
  );
}

export default CourseCards;
