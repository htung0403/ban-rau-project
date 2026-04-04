import * as React from "react"
import { DayPicker } from "react-day-picker"
import { vi } from "date-fns/locale"
import "react-day-picker/style.css"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar(props: CalendarProps) {
  return (
    <div className="rdp-custom">
      <style>{`
        .rdp-custom .rdp-root {
          font-size: 0.8rem;
          --rdp-accent-color: var(--primary, #3b82f6);
          --rdp-accent-background-color: color-mix(in srgb, var(--primary, #3b82f6) 15%, transparent);
          --rdp-day-height: 32px;
          --rdp-day-width: 32px;
        }
        .rdp-custom .rdp-caption_label {
          font-size: 0.85rem;
          font-weight: 700;
        }
        .rdp-custom .rdp-day {
          height: 32px;
          width: 32px;
        }
        .rdp-custom th, .rdp-custom td {
           padding: 1px 0 !important;
        }
        .rdp-custom .rdp-table {
           border-spacing: 0;
           margin-top: 0.5em;
        }
      `}</style>
      <DayPicker locale={vi} {...props} />
    </div>
  )
}

export { Calendar }
