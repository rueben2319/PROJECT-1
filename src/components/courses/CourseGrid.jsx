import React from 'react'
import CourseCard from './CourseCard.jsx'
import Card from '../ui/Card.jsx'
import Skeleton from '../ui/Skeleton.jsx'
import EmptyState from '../ui/EmptyState.jsx'

function CourseGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-live="polite" aria-label="Loading courses">
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
    return <EmptyState icon="📚" title="No matching courses yet" description="Try another subject or grade filter. New courses are added regularly." />
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => (
        <CourseCard key={course.id} course={course} enrollment={enrollments?.find((e) => e.course_id === course.id)} onUnlock={onUnlock} />
      ))}
    </div>
  )
}
