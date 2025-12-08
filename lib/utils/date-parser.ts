import { addDays, nextSaturday, nextSunday, startOfDay, startOfWeek, addWeeks, nextMonday, setHours, setMinutes, setSeconds, setMilliseconds } from "date-fns";

interface ParsedDate {
  date: Date | null;
  matchedText: string | null;
}

/**
 * Parse natural language date expressions from text
 * Supports: today, tomorrow, next week, weekend, monday, tuesday, etc.
 */
export function parseNaturalLanguageDate(text: string): ParsedDate {
  const lowerText = text.toLowerCase();
  const now = new Date();
  const today = startOfDay(now);

  // Check for "today"
  if (lowerText.includes("today")) {
    return { date: today, matchedText: "today" };
  }

  // Check for "tomorrow"
  if (lowerText.includes("tomorrow") || lowerText.includes("tmr")) {
    return { date: addDays(today, 1), matchedText: "tomorrow" };
  }

  // Check for "next week"
  if (lowerText.includes("next week")) {
    const nextWeekStart = startOfWeek(addWeeks(today, 1), { weekStartsOn: 1 }); // Monday
    return { date: nextWeekStart, matchedText: "next week" };
  }

  // Check for "this week" or "week"
  if (lowerText.includes("this week") || lowerText.match(/\bweek\b/)) {
    const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    return { date: thisWeekStart, matchedText: "this week" };
  }

  // Check for "weekend"
  if (lowerText.includes("weekend")) {
    const saturday = nextSaturday(today);
    // If today is Saturday or Sunday, return today
    if (now.getDay() === 6 || now.getDay() === 0) {
      return { date: today, matchedText: "weekend" };
    }
    return { date: saturday, matchedText: "weekend" };
  }

  // Check for specific days of the week
  const dayPatterns: { [key: string]: number } = {
    "monday": 1,
    "mon": 1,
    "tuesday": 2,
    "tue": 2,
    "wednesday": 3,
    "wed": 3,
    "thursday": 4,
    "thu": 4,
    "friday": 5,
    "fri": 5,
    "saturday": 6,
    "sat": 6,
    "sunday": 0,
    "sun": 0,
  };

  for (const [dayName, dayNumber] of Object.entries(dayPatterns)) {
    const regex = new RegExp(`\\b${dayName}\\b`, "i");
    if (regex.test(lowerText)) {
      const currentDay = now.getDay();
      let daysToAdd = dayNumber - currentDay;

      // If the day has passed this week, schedule for next week
      if (daysToAdd <= 0) {
        daysToAdd += 7;
      }

      return {
        date: addDays(today, daysToAdd),
        matchedText: dayName
      };
    }
  }

  // No date found
  return { date: null, matchedText: null };
}

/**
 * Extract and parse account tags from text
 * Format: #accountname or #account_name
 */
export function parseAccountTag(text: string, accounts: Array<{ id: string; email: string; name?: string | null }>): {
  accountId: string | null;
  matchedText: string | null;
} {
  const hashtagRegex = /#(\w+)/g;
  const matches = text.matchAll(hashtagRegex);

  for (const match of matches) {
    const tag = match[1].toLowerCase();

    // Try to match against account email (before @)
    const matchedAccount = accounts.find(account => {
      const emailPrefix = account.email.split("@")[0].toLowerCase();
      const name = account.name?.toLowerCase() || "";

      return emailPrefix.includes(tag) ||
             tag.includes(emailPrefix) ||
             name.includes(tag) ||
             tag.includes(name);
    });

    if (matchedAccount) {
      return {
        accountId: matchedAccount.id,
        matchedText: match[0]
      };
    }
  }

  return { accountId: null, matchedText: null };
}

/**
 * Remove matched date and account tags from text
 */
export function cleanTaskText(text: string, dateMatch: string | null, accountMatch: string | null): string {
  let cleaned = text;

  if (dateMatch) {
    // Remove the date text (case-insensitive)
    const dateRegex = new RegExp(`\\b${dateMatch}\\b`, "gi");
    cleaned = cleaned.replace(dateRegex, "");
  }

  if (accountMatch) {
    // Remove the hashtag
    cleaned = cleaned.replace(accountMatch, "");
  }

  // Clean up extra whitespace
  return cleaned.replace(/\s+/g, " ").trim();
}
