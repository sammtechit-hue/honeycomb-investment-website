import { Request } from "express";
export interface AuthenticationRequest extends Request {
    user: {
        id: string;
        email: string;
        role: string;
    };
}

export interface RequestAuditContext {
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
}