'use client'

import { useState, useEffect } from 'react'

interface CalendarEvent {
  id: string
  title: string
  description?: string
  date: string
  time?: string
  type: 'meeting' | 'deadline' | 'reminder' | 'task'
  projectId?: string
}

interface CalendarProps {
  projectId?: string
}

const EVENT_COLORS = {
  meeting: { bg: 'rgba(0, 212, 255, 0.15)', border: 'var(--accent-cyan)', icon: '#00d4ff' },
  deadline: { bg: 'rgba(236, 72, 153, 0.15)', border: 'var(--accent-pink)', icon: '#ec4899' },
  reminder: { bg: 'rgba(245, 158, 11, 0.15)', border: 'var(--accent-amber)', icon: '#f59e0b' },
  task: { bg: 'rgba(34, 197, 94, 0.15)', border: 'var(--accent-green)', icon: '#22c55e' }
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function Calendar({ projectId }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showEventModal, setShowEventModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
    title: '',
    description: '',
    type: 'task',
    time: ''
  })

  // Load events from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('master-studio-calendar-events')
    if (saved) {
      try {
        const allEvents = JSON.parse(saved)
        // Filter by project if specified
        if (projectId) {
          setEvents(allEvents.filter((e: CalendarEvent) => 
            e.projectId === projectId || !e.projectId
          ))
        } else {
          setEvents(allEvents)
        }
      } catch (e) {
        console.error('Error loading calendar events:', e)
      }
    }
  }, [projectId])

  // Save events to localStorage
  const saveEvents = (updatedEvents: CalendarEvent[]) => {
    const saved = localStorage.getItem('master-studio-calendar-events')
    let allEvents: CalendarEvent[] = saved ? JSON.parse(saved) : []
    
    // Remove events for current project context
    if (projectId) {
      allEvents = allEvents.filter((e: CalendarEvent) => 
        e.projectId !== projectId && e.projectId
      )
    }
    
    // Add updated events
    const otherEvents = allEvents.filter((e: CalendarEvent) => 
      !updatedEvents.find(ue => ue.id === e.id)
    )
    allEvents = [...otherEvents, ...updatedEvents]
    
    localStorage.setItem('master-studio-calendar-events', JSON.stringify(allEvents))
  }

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const formatDateKey = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const getEventsForDate = (dateKey: string) => {
    return events.filter(e => e.date === dateKey)
  }

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const openNewEventModal = (dateKey: string) => {
    setSelectedDate(dateKey)
    setEditingEvent(null)
    setNewEvent({
      title: '',
      description: '',
      type: 'task',
      time: '',
      date: dateKey
    })
    setShowEventModal(true)
  }

  const openEditEventModal = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingEvent(event)
    setNewEvent({ ...event })
    setSelectedDate(event.date)
    setShowEventModal(true)
  }

  const saveEvent = () => {
    if (!newEvent.title?.trim() || !selectedDate) return

    const eventData: CalendarEvent = {
      id: editingEvent?.id || Date.now().toString(),
      title: newEvent.title.trim(),
      description: newEvent.description?.trim() || '',
      date: selectedDate,
      time: newEvent.time || '',
      type: (newEvent.type as CalendarEvent['type']) || 'task',
      projectId: projectId || undefined
    }

    let updatedEvents: CalendarEvent[]
    if (editingEvent) {
      updatedEvents = events.map(e => e.id === editingEvent.id ? eventData : e)
    } else {
      updatedEvents = [...events, eventData]
    }

    setEvents(updatedEvents)
    saveEvents(updatedEvents)
    setShowEventModal(false)
    setEditingEvent(null)
    setNewEvent({ title: '', description: '', type: 'task', time: '' })
  }

  const deleteEvent = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updatedEvents = events.filter(e => e.id !== eventId)
    setEvents(updatedEvents)
    saveEvents(updatedEvents)
    if (showEventModal) {
      setShowEventModal(false)
    }
  }

  const renderCalendarGrid = () => {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate)
    const days = []

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty" />)
    }

    // Days of the month
    const today = new Date()
    const isCurrentMonth = today.getMonth() === currentDate.getMonth() && 
                           today.getFullYear() === currentDate.getFullYear()

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = formatDateKey(currentDate.getFullYear(), currentDate.getMonth(), day)
      const dayEvents = getEventsForDate(dateKey)
      const isToday = isCurrentMonth && today.getDate() === day

      days.push(
        <div
          key={day}
          className={`calendar-day ${isToday ? 'today' : ''} ${dayEvents.length > 0 ? 'has-events' : ''}`}
          onClick={() => openNewEventModal(dateKey)}
        >
          <div className="day-number">{day}</div>
          <div className="day-events">
            {dayEvents.slice(0, 3).map(event => (
              <div
                key={event.id}
                className="day-event-dot"
                style={{ background: EVENT_COLORS[event.type].icon }}
                title={event.title}
                onClick={(e) => openEditEventModal(event, e)}
              />
            ))}
            {dayEvents.length > 3 && (
              <div className="day-event-more">+{dayEvents.length - 3}</div>
            )}
          </div>
        </div>
      )
    }

    return days
  }

  const renderUpcomingEvents = () => {
    const today = new Date().toISOString().split('T')[0]
    const upcoming = events
      .filter(e => e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5)

    if (upcoming.length === 0) {
      return (
        <div className="empty-events">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span>No upcoming events</span>
        </div>
      )
    }

    return upcoming.map(event => (
      <div key={event.id} className="upcoming-event-item">
        <div 
          className="event-type-indicator"
          style={{ background: EVENT_COLORS[event.type].icon }}
        />
        <div className="event-info">
          <div className="event-title">{event.title}</div>
          <div className="event-meta">
            {new Date(event.date).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric' 
            })}
            {event.time && ` • ${event.time}`}
          </div>
        </div>
        <button 
          className="event-delete-btn"
          onClick={(e) => deleteEvent(event.id, e)}
          title="Delete"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    ))
  }

  return (
    <div className="calendar-container">
      {/* Calendar Header */}
      <div className="calendar-header">
        <div className="calendar-nav">
          <button className="nav-btn" onClick={() => navigateMonth(-1)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <h2 className="calendar-title">
            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button className="nav-btn" onClick={() => navigateMonth(1)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
        <button className="today-btn" onClick={goToToday}>Today</button>
      </div>

      <div className="calendar-content">
        {/* Main Calendar */}
        <div className="calendar-main">
          {/* Weekday Headers */}
          <div className="weekday-headers">
            {WEEKDAYS.map(day => (
              <div key={day} className="weekday-header">{day}</div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="calendar-grid">
            {renderCalendarGrid()}
          </div>
        </div>

        {/* Sidebar - Upcoming Events */}
        <div className="calendar-sidebar">
          <h3 className="sidebar-title">Upcoming Events</h3>
          <div className="upcoming-events">
            {renderUpcomingEvents()}
          </div>

          {/* Legend */}
          <div className="event-legend">
            <h4 className="legend-title">Event Types</h4>
            {Object.entries(EVENT_COLORS).map(([type, colors]) => (
              <div key={type} className="legend-item">
                <div 
                  className="legend-dot"
                  style={{ background: colors.icon }}
                />
                <span className="legend-label">
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <div className="modal-overlay" onClick={() => setShowEventModal(false)}>
          <div className="modal-content event-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingEvent ? 'Edit Event' : 'New Event'}</h3>
              <button className="modal-close" onClick={() => setShowEventModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={selectedDate || ''}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="modal-input"
                />
              </div>

              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={newEvent.title || ''}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="Event title..."
                  className="modal-input"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newEvent.description || ''}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="Add details..."
                  className="modal-textarea"
                  rows={3}
                />
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Type</label>
                  <select
                    value={newEvent.type || 'task'}
                    onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as CalendarEvent['type'] })}
                    className="modal-select"
                  >
                    <option value="task">Task</option>
                    <option value="meeting">Meeting</option>
                    <option value="deadline">Deadline</option>
                    <option value="reminder">Reminder</option>
                  </select>
                </div>

                <div className="form-group flex-1">
                  <label>Time</label>
                  <input
                    type="time"
                    value={newEvent.time || ''}
                    onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                    className="modal-input"
                  />
                </div>
              </div>

              {/* Selected Day Events */}
              {selectedDate && getEventsForDate(selectedDate).length > 0 && (
                <div className="day-events-list">
                  <label>Events on this day</label>
                  {getEventsForDate(selectedDate).map(event => (
                    <div key={event.id} className="day-event-item">
                      <div 
                        className="event-dot-small"
                        style={{ background: EVENT_COLORS[event.type].icon }}
                      />
                      <span className="event-item-title">{event.title}</span>
                      {event.time && <span className="event-item-time">{event.time}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer">
              {editingEvent && (
                <button 
                  className="modal-btn danger"
                  onClick={(e) => deleteEvent(editingEvent.id, e)}
                >
                  Delete
                </button>
              )}
              <div className="modal-actions">
                <button 
                  className="modal-btn secondary" 
                  onClick={() => setShowEventModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="modal-btn primary" 
                  onClick={saveEvent}
                  disabled={!newEvent.title?.trim()}
                >
                  {editingEvent ? 'Save' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .calendar-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          padding: 20px;
          gap: 16px;
        }

        .calendar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--glass-border);
        }

        .calendar-nav {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .nav-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid var(--glass-border);
          background: rgba(255,255,255,0.05);
          color: var(--text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        .nav-btn:hover {
          background: rgba(255,255,255,0.1);
          color: var(--text-primary);
        }

        .calendar-title {
          font-size: 20px;
          font-weight: 600;
          margin: 0;
          min-width: 200px;
          text-align: center;
          background: linear-gradient(135deg, var(--accent-cyan), var(--accent-purple));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .today-btn {
          padding: 8px 16px;
          border-radius: 8px;
          border: 1px solid var(--glass-border);
          background: rgba(0,212,255,0.1);
          color: var(--accent-cyan);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .today-btn:hover {
          background: rgba(0,212,255,0.2);
        }

        .calendar-content {
          display: flex;
          flex: 1;
          gap: 20px;
          min-height: 0;
        }

        .calendar-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .weekday-headers {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
          margin-bottom: 8px;
        }

        .weekday-header {
          text-align: center;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 8px;
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
          flex: 1;
        }

        .calendar-day {
          aspect-ratio: 1;
          border-radius: 10px;
          background: rgba(255,255,255,0.03);
          border: 1px solid transparent;
          padding: 8px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          transition: all 0.15s ease;
          position: relative;
          min-height: 0;
        }

        .calendar-day:hover {
          background: rgba(255,255,255,0.06);
          border-color: var(--glass-border);
        }

        .calendar-day.empty {
          background: transparent;
          cursor: default;
        }

        .calendar-day.today {
          background: rgba(0,212,255,0.08);
          border-color: var(--accent-cyan);
        }

        .calendar-day.today .day-number {
          color: var(--accent-cyan);
          font-weight: 600;
        }

        .day-number {
          font-size: 14px;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }

        .day-events {
          display: flex;
          flex-wrap: wrap;
          gap: 3px;
          align-content: flex-start;
          flex: 1;
          width: 100%;
        }

        .day-event-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          cursor: pointer;
          transition: transform 0.15s ease;
        }

        .day-event-dot:hover {
          transform: scale(1.5);
        }

        .day-event-more {
          font-size: 9px;
          color: var(--text-tertiary);
          padding-left: 2px;
        }

        .calendar-sidebar {
          width: 280px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .sidebar-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 4px 0;
        }

        .upcoming-events {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .empty-events {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 24px;
          color: var(--text-tertiary);
          font-size: 13px;
        }

        .upcoming-event-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--glass-border);
          border-radius: 10px;
          transition: all 0.15s ease;
        }

        .upcoming-event-item:hover {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.15);
        }

        .event-type-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .event-info {
          flex: 1;
          min-width: 0;
        }

        .event-title {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .event-meta {
          font-size: 11px;
          color: var(--text-tertiary);
          margin-top: 2px;
        }

        .event-delete-btn {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: var(--text-tertiary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: all 0.15s ease;
        }

        .upcoming-event-item:hover .event-delete-btn {
          opacity: 1;
        }

        .event-delete-btn:hover {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .event-legend {
          padding-top: 16px;
          border-top: 1px solid var(--glass-border);
        }

        .legend-title {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          margin: 0 0 12px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 0;
        }

        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .legend-label {
          font-size: 13px;
          color: var(--text-secondary);
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: var(--glass-bg);
          backdrop-filter: var(--glass-blur);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          width: 90%;
          max-width: 420px;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .event-modal {
          max-width: 400px;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid var(--glass-border);
        }

        .modal-header h3 {
          font-size: 16px;
          font-weight: 600;
          margin: 0;
        }

        .modal-close {
          background: none;
          border: none;
          color: var(--text-tertiary);
          font-size: 24px;
          cursor: pointer;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.15s ease;
        }

        .modal-close:hover {
          background: rgba(255,255,255,0.05);
          color: var(--text-primary);
        }

        .modal-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          overflow-y: auto;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .form-row {
          display: flex;
          gap: 12px;
        }

        .flex-1 {
          flex: 1;
        }

        .modal-input,
        .modal-textarea,
        .modal-select {
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid var(--glass-border);
          background: rgba(0,0,0,0.25);
          color: var(--text-primary);
          font-size: 14px;
          outline: none;
          font-family: inherit;
          transition: all 0.15s ease;
        }

        .modal-input:focus,
        .modal-textarea:focus,
        .modal-select:focus {
          border-color: rgba(0,212,255,0.3);
        }

        .modal-textarea {
          resize: vertical;
          min-height: 60px;
        }

        .modal-select {
          cursor: pointer;
        }

        .modal-select option {
          background: #1a1a2e;
          color: var(--text-primary);
        }

        .day-events-list {
          margin-top: 8px;
          padding-top: 16px;
          border-top: 1px solid var(--glass-border);
        }

        .day-events-list label {
          display: block;
          margin-bottom: 10px;
        }

        .day-event-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          background: rgba(255,255,255,0.03);
          border-radius: 6px;
          margin-bottom: 6px;
        }

        .event-dot-small {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .event-item-title {
          flex: 1;
          font-size: 13px;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .event-item-time {
          font-size: 11px;
          color: var(--text-tertiary);
        }

        .modal-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-top: 1px solid var(--glass-border);
          gap: 12px;
        }

        .modal-actions {
          display: flex;
          gap: 10px;
          margin-left: auto;
        }

        .modal-btn {
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          border: none;
        }

        .modal-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .modal-btn.secondary {
          background: rgba(255,255,255,0.05);
          color: var(--text-secondary);
        }

        .modal-btn.secondary:hover:not(:disabled) {
          background: rgba(255,255,255,0.1);
          color: var(--text-primary);
        }

        .modal-btn.primary {
          background: linear-gradient(135deg, var(--accent-cyan), var(--accent-purple));
          color: white;
        }

        .modal-btn.primary:hover:not(:disabled) {
          opacity: 0.9;
        }

        .modal-btn.danger {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
        }

        .modal-btn.danger:hover {
          background: rgba(239, 68, 68, 0.25);
        }

        @media (max-width: 900px) {
          .calendar-content {
            flex-direction: column;
          }
          .calendar-sidebar {
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}