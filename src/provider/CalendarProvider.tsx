import { CalendarProvider } from "@/calendar/contexts/calendar-context";

// Fetch your events and users data
const events = await getEvents();
const users = await getUsers();

export default function Layout({ children }) {
  return (
    <CalendarProvider users={users} events={events}>
      {children}
    </CalendarProvider>
  );
}