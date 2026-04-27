import React, { useState } from 'react'
import { Tabs } from '../ui/Tabs.jsx'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'

const subjects = ['All', 'Mathematics', 'English', 'Biology', 'Physics', 'Chemistry', 'History', 'Geography', 'Agriculture', 'Social Studies', 'Bible Knowledge']
const grades = ['Both', 'MSCE', 'JCE']

export default function SubjectFilter({ onFilterChange }) {
  const [selectedSubject, setSelectedSubject] = useState('All')
  const [selectedGrade, setSelectedGrade] = useState('Both')

  const handleSubjectChange = (subject) => {
    setSelectedSubject(subject)
    onFilterChange({ subject, grade: selectedGrade })
  }

  const handleGradeChange = (grade) => {
    setSelectedGrade(grade)
    onFilterChange({ subject: selectedSubject, grade })
  }

  return (
    <div className="mb-8">
      <div className="mb-6 flex items-center justify-between"><h2 className="text-xl font-bold text-primary">Browse Courses</h2><Tabs tabs={grades} active={selectedGrade} onChange={handleGradeChange} /></div>
      <div className="flex flex-wrap gap-2">
        {subjects.map((subject) => (
          <Button key={subject} variant={selectedSubject === subject ? 'primary' : 'outline'} size="sm" className="rounded-full" onClick={() => handleSubjectChange(subject)}>{subject}</Button>
        ))}
      </div>
      {(selectedSubject !== 'All' || selectedGrade !== 'Both') && <div className="mt-4 flex items-center gap-2"><span className="text-sm text-secondary">Active:</span><Badge variant="primary">{selectedSubject}</Badge><Badge variant="primary">{selectedGrade}</Badge></div>}
    </div>
  )
}
