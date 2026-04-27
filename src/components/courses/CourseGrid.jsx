import React from 'react'
import CourseCard from './CourseCard.jsx'
import Card from '../ui/Card.jsx'
import Skeleton from '../ui/Skeleton.jsx'

function CourseGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <Card key={item} className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="space-y-2 pt-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </Card>
      ))}
    </div>
  )
}

export default function CourseGrid({ courses, enrollments, loading, onUnlock }) {
  if (loading) return <CourseGridSkeleton />

  if (!courses || courses.length === 0) {
    return (
      <Card className="py-12 text-center">
        <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-surface-muted text-2xl leading-[3rem]">📚</div>
        <h3 className="text-lg font-semibold text-primary">No matching courses yet</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-secondary">Try another subject or grade filter. New courses are added regularly.</p>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => (
        <CourseCard key={course.id} course={course} enrollment={enrollments?.find((e) => e.course_id === course.id)} onUnlock={onUnlock} />
      ))}
    </div>
  )
}
