import React, { useState } from 'react'

const subjects = [
  'All',
  'Mathematics',
  'English',
  'Biology',
  'Physics',
  'Chemistry',
  'History',
  'Geography',
  'Agriculture',
  'Social Studies',
  'Bible Knowledge'
]

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
      {/* Grade Toggle */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Browse Courses</h2>
        <div className="flex bg-gray-100 rounded-lg p-1">
          {grades.map((grade) => (
            <button
              key={grade}
              onClick={() => handleGradeChange(grade)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedGrade === grade
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {grade}
            </button>
          ))}
        </div>
      </div>

      {/* Subject Filter */}
      <div className="relative">
        <div className="flex items-center mb-4">
          <svg className="w-5 h-5 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="text-sm font-medium text-gray-700">Filter by subject</span>
        </div>
        
        <div className="overflow-x-auto pb-2">
          <div className="flex space-x-2 min-w-max">
            {subjects.map((subject) => (
              <button
                key={subject}
                onClick={() => handleSubjectChange(subject)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  selectedSubject === subject
                    ? 'bg-primary-600 text-white shadow-lg transform scale-105'
                    : 'bg-white border border-gray-300 text-gray-700 hover:border-primary-300 hover:text-primary-600'
                }`}
              >
                {subject}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active Filters Display */}
      {(selectedSubject !== 'All' || selectedGrade !== 'Both') && (
        <div className="mt-4 flex items-center flex-wrap gap-2">
          <span className="text-sm text-gray-600">Active filters:</span>
          {selectedSubject !== 'All' && (
            <span className="badge badge-primary">
              {selectedSubject}
              <button
                onClick={() => handleSubjectChange('All')}
                className="ml-2 text-primary-200 hover:text-white"
              >
                ×
              </button>
            </span>
          )}
          {selectedGrade !== 'Both' && (
            <span className="badge badge-primary">
              {selectedGrade}
              <button
                onClick={() => handleGradeChange('Both')}
                className="ml-2 text-primary-200 hover:text-white"
              >
                ×
              </button>
            </span>
          )}
          <button
            onClick={() => {
              handleSubjectChange('All')
              handleGradeChange('Both')
            }}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  )
}
