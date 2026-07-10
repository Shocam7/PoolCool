/**
 * Placeholder functions for Supabase and Gemini integrations.
 * These are structured to be easily replaced with real implementations later.
 */

import { supabase } from "./supabase";

export interface Space {
  id: string;
  name: string;
  description: string;
  rules?: string;
  lat: number;
  lng: number;
  is_private: boolean;
  host_id?: string;
  effective_temp?: number;
  is_ai_analyzed: boolean;
  image_url?: string;
  images?: string[];
  maintained_temp?: number;
  maintained_temp_unit?: "C" | "F";
}

export interface AccessRequest {
  id: string;
  space_id: string;
  requester_id: string;
  answers_text: string;
  photo_url?: string;
  status: "pending" | "approved" | "rejected";
}

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: "host" | "guest";
}

// Mock data
export const MOCK_SPACES: Space[] = [
  {
    id: "1",
    name: "Downtown Library",
    description: "Quiet, air-conditioned public library with seating.",
    rules: "No loud talking, keep food inside the cafeteria, respect quiet hours.",
    lat: 34.0522,
    lng: -118.2437,
    is_private: false,
    effective_temp: 72,
    is_ai_analyzed: true,
    image_url: "https://picsum.photos/seed/library/400/300",
    images: [
      "https://picsum.photos/seed/library/400/300",
      "https://picsum.photos/seed/library2/400/300"
    ],
    maintained_temp: 21,
    maintained_temp_unit: "C",
  },
  {
    id: "2",
    name: "Shaded Community Park",
    description: "Lots of trees, good breeze, water fountain available.",
    rules: "Keep pets on leash, do not litter, park closes at sundown.",
    lat: 34.0562,
    lng: -118.2507,
    is_private: false,
    effective_temp: 78,
    is_ai_analyzed: false,
    image_url: "https://picsum.photos/seed/park/400/300",
    images: [
      "https://picsum.photos/seed/park/400/300",
      "https://picsum.photos/seed/park2/400/300"
    ],
    maintained_temp: 25,
    maintained_temp_unit: "C",
  },
  {
    id: "3",
    name: "Alex's Pool & Patio",
    description: "Willing to host a few folks during the heatwave. Cold drinks provided.",
    rules: "Must call or request access in advance, bring your own towel.",
    lat: 34.0452,
    lng: -118.2387,
    is_private: true,
    effective_temp: 70,
    is_ai_analyzed: true,
    image_url: "https://picsum.photos/seed/pool/400/300",
    images: [
      "https://picsum.photos/seed/pool/400/300",
      "https://picsum.photos/seed/pool2/400/300"
    ],
    maintained_temp: 68,
    maintained_temp_unit: "F",
  },
];

/**
 * Supabase DB Methods
 */

export async function fetchSpaces(): Promise<Space[]> {
  // If Supabase is not configured, return mock data gracefully
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === "https://placeholder.supabase.co") {
    // Try to load user-created spaces from local storage
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("poolcool_spaces");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          return [...MOCK_SPACES, ...parsed];
        } catch {
          return MOCK_SPACES;
        }
      }
    }
    return MOCK_SPACES;
  }

  const { data, error } = await supabase.from("spaces").select("*");
  if (error) {
    console.error("Error fetching spaces:", error.message || error);
    throw error;
  }
  return data || [];
}

export async function addSpace(spaceData: Omit<Space, "id">): Promise<Space> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === "https://placeholder.supabase.co") {
    // Save to local storage mock DB
    const added = { id: Math.random().toString(), ...spaceData } as Space;
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("poolcool_spaces");
      const current = stored ? JSON.parse(stored) : [];
      current.push(added);
      localStorage.setItem("poolcool_spaces", JSON.stringify(current));
    }
    return added;
  }

  const { data, error } = await supabase
    .from("spaces")
    .insert([spaceData])
    .select()
    .single();

  if (error) {
    console.error("Error adding space:", error.message || error);
    throw error;
  }
  return data;
}

export async function requestPrivateAccess(requestData: Omit<AccessRequest, "id" | "status">): Promise<AccessRequest> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === "https://placeholder.supabase.co") {
    const added = { id: Math.random().toString(), status: "pending", ...requestData } as AccessRequest;
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("poolcool_requests");
      const current = stored ? JSON.parse(stored) : [];
      current.push(added);
      localStorage.setItem("poolcool_requests", JSON.stringify(current));
    }
    return added;
  }

  const { data, error } = await supabase
    .from("access_requests")
    .insert([{ ...requestData, status: "pending" }])
    .select()
    .single();

  if (error) {
    console.error("Error submitting access request:", error.message || error);
    throw error;
  }
  return data;
}

/**
 * Authentication Methods (Real Supabase + Mock Storage Fallback)
 */

export async function signUpUser(email: string, password: string, name: string, role: "host" | "guest"): Promise<AppUser> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === "https://placeholder.supabase.co") {
    const mockUser: AppUser = { id: "mock-uid-" + Math.random().toString(36).substr(2, 9), email, name, role };
    if (typeof window !== "undefined") {
      localStorage.setItem("poolcool_user", JSON.stringify(mockUser));
    }
    return mockUser;
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });
  if (authError) throw authError;
  if (!authData.user) throw new Error("Sign up failed");

  // Insert profile record
  const { error: profileError } = await supabase
    .from("users")
    .insert([{ id: authData.user.id, name, role }]);

  if (profileError) {
    console.error("Error creating profile:", profileError.message);
  }

  return {
    id: authData.user.id,
    email: authData.user.email || email,
    name,
    role,
  };
}

export async function signInUser(email: string, password: string): Promise<AppUser> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === "https://placeholder.supabase.co") {
    const mockUser: AppUser = { id: "mock-uid-alex", email, name: nameFromEmail(email), role: "host" };
    if (typeof window !== "undefined") {
      localStorage.setItem("poolcool_user", JSON.stringify(mockUser));
    }
    return mockUser;
  }

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (authError) throw authError;
  if (!authData.user) throw new Error("Sign in failed");

  // Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("*")
    .eq("id", authData.user.id)
    .single();

  if (profileError) {
    // Fallback: create a profile if it doesn't exist
    const defaultName = nameFromEmail(email);
    const { data: newProfile, error: createError } = await supabase
      .from("users")
      .insert([{ id: authData.user.id, name: defaultName, role: "guest" }])
      .select()
      .single();
    
    if (createError) {
      return {
        id: authData.user.id,
        email: authData.user.email || email,
        name: defaultName,
        role: "guest",
      };
    }
    return {
      id: authData.user.id,
      email: authData.user.email || email,
      name: newProfile.name,
      role: newProfile.role,
    };
  }

  return {
    id: authData.user.id,
    email: authData.user.email || email,
    name: profile.name,
    role: profile.role,
  };
}

export async function signOutUser(): Promise<void> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === "https://placeholder.supabase.co") {
    if (typeof window !== "undefined") {
      localStorage.removeItem("poolcool_user");
    }
    return;
  }
  await supabase.auth.signOut();
}

export async function getCurrentUser(): Promise<AppUser | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === "https://placeholder.supabase.co") {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("poolcool_user");
      return stored ? JSON.parse(stored) : null;
    }
    return null;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return {
      id: user.id,
      email: user.email || "",
      name: nameFromEmail(user.email || ""),
      role: "guest",
    };
  }

  return {
    id: user.id,
    email: user.email || "",
    name: profile.name,
    role: profile.role,
  };
}

function nameFromEmail(email: string): string {
  return email.split("@")[0].replace(/[._-]/g, " ");
}

/**
 * Access Request Manage Methods
 */

export async function fetchHostAccessRequests(hostId: string): Promise<(AccessRequest & { space_name?: string })[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === "https://placeholder.supabase.co") {
    if (typeof window !== "undefined") {
      const storedReqs = localStorage.getItem("poolcool_requests");
      const reqs: AccessRequest[] = storedReqs ? JSON.parse(storedReqs) : [];
      // Mock details
      return reqs.map(r => ({ ...r, space_name: "Alex's Pool & Patio" }));
    }
    return [];
  }

  // Get host's spaces
  const { data: hostSpaces, error: spacesError } = await supabase
    .from("spaces")
    .select("id, name")
    .eq("host_id", hostId);

  if (spacesError || !hostSpaces || hostSpaces.length === 0) return [];

  const spaceIds = hostSpaces.map(s => s.id);
  const { data: reqs, error: reqsError } = await supabase
    .from("access_requests")
    .select("*")
    .in("space_id", spaceIds);

  if (reqsError) throw reqsError;

  return (reqs || []).map(r => {
    const space = hostSpaces.find(s => s.id === r.space_id);
    return {
      ...r,
      space_name: space?.name,
    };
  });
}

export async function fetchMyRequests(requesterId: string): Promise<(AccessRequest & { space_name?: string })[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === "https://placeholder.supabase.co") {
    if (typeof window !== "undefined") {
      const storedReqs = localStorage.getItem("poolcool_requests");
      const reqs: AccessRequest[] = storedReqs ? JSON.parse(storedReqs) : [];
      const userReqs = reqs.filter(r => r.requester_id === requesterId);
      return userReqs.map(r => ({ ...r, space_name: "Alex's Pool & Patio" }));
    }
    return [];
  }

  const { data, error } = await supabase
    .from("access_requests")
    .select("*, spaces(name)")
    .eq("requester_id", requesterId);

  if (error) throw error;

  return (data || []).map(r => ({
    ...r,
    space_name: (r as any).spaces?.name || "Private Space"
  }));
}

export async function updateAccessRequestStatus(requestId: string, status: "approved" | "rejected"): Promise<void> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === "https://placeholder.supabase.co") {
    if (typeof window !== "undefined") {
      const storedReqs = localStorage.getItem("poolcool_requests");
      const reqs: AccessRequest[] = storedReqs ? JSON.parse(storedReqs) : [];
      const updated = reqs.map(r => r.id === requestId ? { ...r, status } : r);
      localStorage.setItem("poolcool_requests", JSON.stringify(updated));
    }
    return;
  }

  const { error } = await supabase
    .from("access_requests")
    .update({ status })
    .eq("id", requestId);

  if (error) throw error;
}

/**
 * Gemini API / Open-Meteo API Placeholders
 */

export async function analyzeEnvironment(
  imageFile: File,
  sunlight: boolean,
  plants: boolean,
  ac: boolean
): Promise<{ baseline: number; effective: number; diff: number }> {
  // TODO: 
  // 1. Fetch real baseline from Open-Meteo
  // 2. Pass imageFile and environment answers to Gemini 2.5 Flash via Server Action/API route
  console.log("Analyzing environment with Gemini...", { imageFile, sunlight, plants, ac });
  
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        // Mock calculation
        const baseline = 88;
        let diff = 0;
        
        if (ac) diff -= 15;
        if (plants) diff -= 5;
        if (sunlight) diff += 8;
        
        // Ensure reasonable bounds for mock
        if (diff > 0 && ac) diff = -2;
        
        resolve({
          baseline,
          effective: baseline + diff,
          diff
        });
      } catch (error) {
        reject(error);
      }
    }, 2000);
  });
}
