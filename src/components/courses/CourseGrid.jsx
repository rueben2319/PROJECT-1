import React from 'react'
import CourseCard from './CourseCard.jsx'
import Card from '../ui/Card.jsx'

export default function CourseGrid({ courses, enrollments, onUnlock }) {
  if (!courses || courses.length === 0) {
    return (
      <Card className="py-12 text-center">
        <h3 className="text-lg font-semibold text-primary">No courses found</h3>
        <p className="text-secondary">{courses === null ? 'Loading courses...' : 'Try adjusting your filters'}</p>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => (
        <CourseCard key={course.id} course={course} enrollment={enrollments?.find((e) => e.course_id === course.id)} onUnlock={onUnlock} />
      ))}
    </div>
  )
}
