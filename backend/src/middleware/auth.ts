import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        fullName: string;
        role: string;
        teamId?: string;
      };
    }
  }
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  teamId?: string;
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    
    // Fetch user from database to ensure they still exist and get latest data
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        teamId: true,
        status: true
      }
    });

    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({ error: 'Invalid or inactive user' });
    }

    // Convert null teamId to undefined for type safety
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      teamId: user.teamId || undefined
    };

    req.user = authUser;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

export const requireTeamAccess = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const teamId = req.params.teamId || req.body.teamId;
  
  if (!teamId) {
    return res.status(400).json({ error: 'Team ID required' });
  }

  // Super admins can access any team
  if (req.user.role === 'SUPER_ADMIN') {
    return next();
  }

  // Check if user belongs to the team
  const userTeam = await prisma.user.findFirst({
    where: {
      id: req.user.id,
      teamId: teamId
    }
  });

  if (!userTeam) {
    return res.status(403).json({ error: 'Access denied to this team' });
  }

  next();
};

export const requireSuperAdmin = requireRole(['SUPER_ADMIN']);
export const requireAnalyst = requireRole(['SUPER_ADMIN', 'ANALYST']);
export const requireViewer = requireRole(['SUPER_ADMIN', 'ANALYST', 'VIEWER']);

// Default export for the main authentication middleware
export default authenticateToken; 