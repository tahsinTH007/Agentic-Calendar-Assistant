import { google } from "googleapis";
import { randomUUID } from "node:crypto";
import { getCalendarAccessToken } from "./token.service.js";

function calendarClient(accessToken: string) {
  const auth = new google.auth.OAuth2();

  auth.setCredentials({
    access_token: accessToken,
  });

  return google.calendar({
    version: "v3",
    auth,
  });
}

async function calendarForUser(authUserId: string) {
  const accessToken = await getCalendarAccessToken(authUserId);

  return calendarClient(accessToken);
}

function formatEvent(event: {
  id?: string | null;
  summary?: string | null;
  description?: string | null;
  location?: string | null;
  start?: { dateTime?: string | null; date?: string | null } | null;
  end?: { dateTime?: string | null; date?: string | null } | null;
  htmlLink?: string | null;
  hangoutLink?: string | null;
  attendees?: Array<{
    email?: string | null;
    displayName?: string | null;
  }> | null;
}) {
  return {
    id: event.id,
    title: event.summary ?? "(no title)",
    description: event.description?.trim() || null,
    location: event.location?.trim() || null,
    start: event.start?.dateTime ?? event.start?.date ?? null,
    end: event.end?.dateTime ?? event.end?.date ?? null,
    htmlLink: event.htmlLink ?? null,
    meetLink: event.hangoutLink ?? null,
    attendees: (event.attendees ?? [])
      .map((person) => person.email || person.displayName)
      .filter((value): value is string => Boolean(value)),
  };
}

export async function listUpcomingMeetings(input: {
  authUserId: string;
  maxResults?: number;
  todayOnly?: boolean;
}) {
  const calendar = await calendarForUser(input.authUserId);

  let timeMin = new Date().toISOString();

  let timeMax: string | undefined;

  if (input.todayOnly) {
    const start = new Date();

    // 00:00:00:00
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    timeMin = start.toISOString();
    timeMax = end.toISOString();
  }

  const response = await calendar.events.list({
    calendarId: "primary",
    timeMin,
    timeMax,
    maxResults: input.maxResults ?? 10,
    singleEvents: true,
    orderBy: "startTime",
  });

  return (response.data.items ?? []).map(formatEvent);
}