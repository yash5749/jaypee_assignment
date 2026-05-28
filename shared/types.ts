export interface UserDto {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
}

export interface StudyRoomDto {
  id: string;
  name: string;
  code: string;
  createdById: string;
  createdAt: string;
}

export interface RoomMemberDto {
  id: string;
  userId: string;
  roomId: string;
  joinedAt: string;
  user?: UserDto;
}

export interface MessageDto {
  id: string;
  content: string;
  userId: string;
  roomId: string;
  createdAt: string;
  user?: UserDto;
}

export interface StudySessionDto {
  id: string;
  roomId: string;
  startedById: string;
  startedAt: string;
  endedAt?: string | null;
  duration?: number | null;
  trackedSeconds: number;
  status: "active" | "completed" | "left";
}

export interface SessionAnalyticsDto {
  dailyStudySeconds: number;
  weeklyStudySeconds: number;
  monthlyStudySeconds: number;
  totalStudySeconds: number;
  totalSessions: number;
  activeSessions: number;
  roomSummaries: RoomSessionSummaryDto[];
  recentActivity: RecentActivityDto[];
}

export interface RoomSessionSummaryDto {
  roomId: string;
  roomName: string;
  roomCode: string;
  totalStudySeconds: number;
  totalSessions: number;
  totalMessages: number;
}

export interface RecentActivityDto {
  type: "message" | "session-started" | "session-ended";
  roomId: string;
  roomName: string;
  createdAt: string;
  userId: string;
  userName: string;
  content?: string;
  durationSeconds?: number;
}
