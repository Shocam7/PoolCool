"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Plus, ThermometerSun, Layers, Flame, User, LogOut, Lock, Check, X, ShieldAlert, ClipboardList, Shield, ShieldCheck, Search, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { 
  fetchSpaces, 
  addSpace, 
  analyzeEnvironment, 
  Space, 
  MOCK_SPACES,
  AppUser,
  AccessRequest,
  signUpUser,
  signInUser,
  signOutUser,
  getCurrentUser,
  fetchHostAccessRequests,
  fetchMyRequests,
  updateAccessRequestStatus,
  requestPrivateAccess
} from "@/lib/api";

// Dynamically import the map to avoid SSR issues with Leaflet
const Map = dynamic(() => import("@/components/Map"), { ssr: false });
const LocationPickerMap = dynamic(() => import("@/components/LocationPickerMap"), { ssr: false });

export default function Home() {
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [isAddSpaceOpen, setIsAddSpaceOpen] = useState(false);
  const [isAnalyseOpen, setIsAnalyseOpen] = useState(false);
  const [isFindOpen, setIsFindOpen] = useState(false);
  const [centerSpace, setCenterSpace] = useState<Space | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // App Data State
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [isLoadingSpaces, setIsLoadingSpaces] = useState(true);

  // Authentication & Session State
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authRole, setAuthRole] = useState<"host" | "guest">("guest");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Private Access Request Form State
  const [isRequestAccessOpen, setIsRequestAccessOpen] = useState(false);
  const [requestingSpace, setRequestingSpace] = useState<Space | null>(null);
  const [requestAnswers, setRequestAnswers] = useState("");
  const [requestPhotoUrl, setRequestPhotoUrl] = useState("");
  const [isRequestingAccess, setIsRequestingAccess] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  // Dashboard State
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [dashboardTab, setDashboardTab] = useState<"my_requests" | "incoming_requests">("my_requests");
  const [myRequests, setMyRequests] = useState<(AccessRequest & { space_name?: string })[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<(AccessRequest & { space_name?: string })[]>([]);

  // Add Space Form State
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [newPos, setNewPos] = useState({ lat: 34.0522, lng: -118.2437 });
  const [isAddingSpace, setIsAddingSpace] = useState(false);
  const [addSpaceError, setAddSpaceError] = useState<string | null>(null);

  // Analysis Form State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{ baseline: number; effective: number; diff: number } | null>(null);

  // Environment Form Fields
  const [hasSun, setHasSun] = useState(false);
  const [hasPlants, setHasPlants] = useState(false);
  const [hasAC, setHasAC] = useState(false);

  // Load spaces and session on mount
  useEffect(() => {
    async function initUserAndSpaces() {
      // 1. Load active user session
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
      } catch (err) {
        console.warn("Could not check current user session", err);
      }

      // 2. Load map spaces
      try {
        const data = await fetchSpaces();
        setSpaces(data.length > 0 ? data : MOCK_SPACES);
      } catch (err) {
        console.warn("Failed to fetch spaces from Supabase. Using mock data.");
        setSpaces(MOCK_SPACES);
      } finally {
        setIsLoadingSpaces(false);
      }
    }
    initUserAndSpaces();
  }, []);

  // Fetch access requests when user logs in/out or updates
  useEffect(() => {
    async function loadRequests() {
      if (!currentUser) {
        setMyRequests([]);
        setIncomingRequests([]);
        return;
      }
      try {
        const my = await fetchMyRequests(currentUser.id);
        setMyRequests(my);

        if (currentUser.role === "host") {
          const inc = await fetchHostAccessRequests(currentUser.id);
          setIncomingRequests(inc);
        }
      } catch (err) {
        console.error("Error fetching requests:", err);
      }
    }
    loadRequests();
  }, [currentUser]);

  // Auth Submit Action
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsAuthenticating(true);
    try {
      if (authMode === "login") {
        const user = await signInUser(authEmail, authPassword);
        setCurrentUser(user);
      } else {
        const user = await signUpUser(authEmail, authPassword, authName, authRole);
        setCurrentUser(user);
      }
      setIsAuthOpen(false);
      // Reset inputs
      setAuthEmail("");
      setAuthPassword("");
      setAuthName("");
    } catch (err: any) {
      setAuthError(err.message || "Authentication failed. Please verify credentials.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Sign out
  const handleSignOut = async () => {
    try {
      await signOutUser();
      setCurrentUser(null);
      setMyRequests([]);
      setIncomingRequests([]);
    } catch (err) {
      console.error("Sign out failed", err);
    }
  };

  // Open "Request Access" from map popup
  const handleOnRequestAccess = (space: Space) => {
    if (!currentUser) {
      setAuthMode("login");
      setIsAuthOpen(true);
      return;
    }
    setRequestingSpace(space);
    setIsRequestAccessOpen(true);
  };

  // Submit request for private space
  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !requestingSpace) return;
    setIsRequestingAccess(true);
    setRequestError(null);
    try {
      const req = await requestPrivateAccess({
        space_id: requestingSpace.id,
        requester_id: currentUser.id,
        answers_text: requestAnswers,
        photo_url: requestPhotoUrl || "https://picsum.photos/seed/id/200/200"
      });
      setMyRequests((prev) => [...prev, req]);
      setIsRequestAccessOpen(false);
      setRequestAnswers("");
      setRequestPhotoUrl("");
      alert("Access request successfully sent to the host!");
    } catch (err: any) {
      setRequestError(err.message || "Failed to submit request.");
    } finally {
      setIsRequestingAccess(false);
    }
  };

  // Approve or Reject Request
  const handleUpdateRequestStatus = async (requestId: string, status: "approved" | "rejected") => {
    try {
      await updateAccessRequestStatus(requestId, status);
      if (currentUser) {
        const inc = await fetchHostAccessRequests(currentUser.id);
        setIncomingRequests(inc);
      }
    } catch (err) {
      alert("Failed to update request status.");
    }
  };

  const handleAddSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPrivate && !currentUser) {
      setAuthMode("login");
      setIsAuthOpen(true);
      return;
    }
    setIsAddingSpace(true);
    setAddSpaceError(null);
    try {
      const added = await addSpace({
        name: newName,
        description: newDescription,
        lat: newPos.lat,
        lng: newPos.lng,
        is_private: isPrivate,
        is_ai_analyzed: false,
        host_id: currentUser?.id
      });
      setSpaces((prev) => [...prev, added as Space]);
      setIsAddSpaceOpen(false);
      
      // Reset form
      setNewName("");
      setNewDescription("");
      setIsPrivate(false);
      setNewPos({ lat: 34.0522, lng: -118.2437 });
    } catch (err) {
      setAddSpaceError("Failed to add space. Please try again.");
    } finally {
      setIsAddingSpace(false);
    }
  };

  const handleAnalyse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const mockFile = new File([""], "placeholder.jpg", { type: "image/jpeg" });
      const result = await analyzeEnvironment(mockFile, hasSun, hasPlants, hasAC);
      setAnalysisResult(result);
    } catch (err) {
      setAnalysisError("AI Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Distance helper
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // returns km
  };

  const filteredSpaces = spaces
    .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || (s.description || "").toLowerCase().includes(searchQuery.toLowerCase()))
    .map(s => {
      const distance = userLocation 
        ? getDistance(userLocation.lat, userLocation.lng, s.lat, s.lng) 
        : null;
      return { ...s, distance };
    })
    .sort((a, b) => {
      if (a.distance !== null && b.distance !== null) {
        return a.distance - b.distance;
      }
      return 0;
    });

  return (
    <main className="w-full h-screen relative flex flex-col font-sans overflow-hidden">
      {/* Header overlay for branding & Profile */}
      <div className="absolute top-0 left-0 right-0 p-3 sm:p-4 z-10 pointer-events-none flex flex-col sm:flex-row justify-between items-stretch sm:items-start gap-3">
        <div className="bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-xl border border-gray-100 pointer-events-auto flex items-center justify-between sm:justify-start gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-md">
              <ThermometerSun className="text-white w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-none">PoolCool</h1>
              <p className="text-[10px] sm:text-[11px] text-gray-500 font-bold uppercase tracking-wider mt-1">Heat Wave Refuge Network</p>
            </div>
          </div>
        </div>

        {/* User Session Control / Dashboards */}
        <div className="flex flex-col items-stretch sm:items-end gap-2 sm:gap-3 pointer-events-auto">
          {currentUser ? (
            <div className="flex items-center justify-between sm:justify-end gap-2 bg-white/95 backdrop-blur-sm p-2 rounded-full shadow-lg border border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xs sm:text-sm">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left px-1">
                  <p className="text-xs font-bold text-gray-800 leading-none">{currentUser.name}</p>
                  <p className="text-[10px] text-gray-500 capitalize">{currentUser.role} Account</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setDashboardTab(currentUser.role === "host" ? "incoming_requests" : "my_requests");
                    setIsDashboardOpen(true);
                  }}
                  className="text-[11px] sm:text-xs flex items-center gap-1 hover:bg-gray-100 text-gray-700 font-semibold rounded-full px-2"
                >
                  <ClipboardList className="w-4 h-4 text-blue-600" />
                  Dashboard
                </Button>

                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleSignOut} 
                  className="rounded-full text-red-500 hover:text-red-600 hover:bg-red-50 h-7 w-7 sm:h-8 sm:w-8"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <Button 
              onClick={() => {
                setAuthMode("login");
                setIsAuthOpen(true);
              }}
              size="default"
              className="shadow-md rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center justify-center gap-1 px-5 border border-slate-700 w-full sm:w-auto"
            >
              <User className="w-4 h-4" />
              Sign In / Sign Up
            </Button>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              onClick={() => setIsAddSpaceOpen(true)}
              size="default" 
              className="flex-1 sm:flex-none shadow-lg rounded-full px-4 sm:px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-1.5 text-xs sm:text-sm"
            >
              <Plus className="w-4 h-4" />
              Add
            </Button>

            <Button 
              onClick={() => {
                setIsFindOpen(true);
                if ("geolocation" in navigator) {
                  navigator.geolocation.getCurrentPosition(
                    (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                    (err) => console.warn("Location error", err)
                  );
                }
              }}
              variant="outline"
              size="default" 
              className="flex-1 sm:flex-none shadow-lg rounded-full px-4 sm:px-5 bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-200 font-bold flex items-center justify-center gap-1.5 text-xs sm:text-sm"
            >
              <Search className="w-4 h-4" />
              Find
            </Button>
            
            <Button 
              onClick={() => setIsAnalyseOpen(true)}
              variant="secondary"
              size="default" 
              className="flex-1 sm:flex-none shadow-lg rounded-full px-4 sm:px-5 bg-white hover:bg-gray-50 text-blue-700 border-2 border-blue-100 font-bold flex items-center justify-center gap-1.5 text-xs sm:text-sm"
            >
              <ThermometerSun className="w-4 h-4" />
              Analyse
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none w-full flex justify-center px-4">
        <div className="bg-white/90 backdrop-blur p-3 rounded-full shadow-lg border border-gray-100 pointer-events-auto flex items-center justify-center gap-2 sm:gap-4 px-4 sm:px-6 w-auto max-w-full">
          <Layers className="w-5 h-5 text-gray-500 hidden sm:block" />
          <div className="flex items-center gap-2">
            <Switch 
              id="heatmap-mode" 
              checked={heatmapEnabled} 
              onCheckedChange={setHeatmapEnabled} 
            />
            <Label htmlFor="heatmap-mode" className="font-semibold cursor-pointer text-xs sm:text-sm whitespace-nowrap">
              Toggle Heatmap (AI Data)
            </Label>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 w-full h-full z-0">
        <Map 
          spaces={spaces} 
          heatmapEnabled={heatmapEnabled} 
          onRequestAccess={handleOnRequestAccess}
          myRequests={myRequests}
          centerSpace={centerSpace}
        />
      </div>

      {/* Auth Dialog */}
      <Dialog open={isAuthOpen} onOpenChange={setIsAuthOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{authMode === "login" ? "Sign In to PoolCool" : "Create Host/Guest Account"}</DialogTitle>
            <DialogDescription>
              We need accounts to verify hosts, request secure access, and manage permissions.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAuthSubmit} className="grid gap-4 py-3">
            {authError && (
              <div className="bg-red-50 text-red-600 text-xs p-3 rounded-md border border-red-100 font-medium">
                {authError}
              </div>
            )}

            {authMode === "signup" && (
              <div className="grid gap-2">
                <Label htmlFor="auth-name">Your Full Name</Label>
                <Input 
                  id="auth-name" 
                  placeholder="Alex Mercer" 
                  required 
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="auth-email">Email Address</Label>
              <Input 
                id="auth-email" 
                type="email" 
                placeholder="you@example.com" 
                required 
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="auth-password">Password</Label>
              <Input 
                id="auth-password" 
                type="password" 
                placeholder="Minimum 6 characters" 
                required 
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
              />
            </div>

            {authMode === "signup" && (
              <div className="grid gap-2 mt-1">
                <Label>Account Purpose</Label>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <div 
                    onClick={() => setAuthRole("guest")}
                    className={`cursor-pointer border-2 p-3 rounded-xl flex flex-col items-center justify-center text-center transition-all ${
                      authRole === "guest" ? "border-blue-600 bg-blue-50/50" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <User className="w-5 h-5 text-blue-600 mb-1" />
                    <span className="text-xs font-bold">I need Refuge</span>
                    <span className="text-[10px] text-gray-500 mt-0.5">Guest access requests</span>
                  </div>
                  
                  <div 
                    onClick={() => setAuthRole("host")}
                    className={`cursor-pointer border-2 p-3 rounded-xl flex flex-col items-center justify-center text-center transition-all ${
                      authRole === "host" ? "border-purple-600 bg-purple-50/50" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Lock className="w-5 h-5 text-purple-600 mb-1" />
                    <span className="text-xs font-bold">I offer Space</span>
                    <span className="text-[10px] text-gray-500 mt-0.5">Private/Public Host</span>
                  </div>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full mt-2" disabled={isAuthenticating}>
              {isAuthenticating ? "Verifying..." : authMode === "login" ? "Sign In" : "Register Account"}
            </Button>

            <div className="text-center text-xs text-gray-500 mt-2">
              {authMode === "login" ? (
                <span>
                  Don&apos;t have an account?{" "}
                  <button 
                    type="button" 
                    onClick={() => setAuthMode("signup")}
                    className="text-blue-600 font-bold hover:underline"
                  >
                    Sign Up
                  </button>
                </span>
              ) : (
                <span>
                  Already registered?{" "}
                  <button 
                    type="button" 
                    onClick={() => setAuthMode("login")}
                    className="text-blue-600 font-bold hover:underline"
                  >
                    Sign In
                  </button>
                </span>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Private Space Access Request Dialog */}
      <Dialog open={isRequestAccessOpen} onOpenChange={setIsRequestAccessOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-purple-600" />
              Request Refuge Access
            </DialogTitle>
            <DialogDescription>
              To access <strong className="text-gray-900">{requestingSpace?.name}</strong>, please complete the requirements requested by the Host.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRequestSubmit} className="grid gap-4 py-3">
            {requestError && (
              <div className="bg-red-50 text-red-600 text-xs p-3 rounded-md font-medium">
                {requestError}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="req-message">Introduce yourself & purpose</Label>
              <Textarea 
                id="req-message" 
                placeholder="e.g., I live two blocks away, our AC is broken. We have 2 children." 
                required 
                value={requestAnswers}
                onChange={(e) => setRequestAnswers(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="req-photo">Profile / Verification Photo URL (Optional)</Label>
              <Input 
                id="req-photo" 
                type="url" 
                placeholder="https://images.unsplash.com/photo-..." 
                value={requestPhotoUrl}
                onChange={(e) => setRequestPhotoUrl(e.target.value)}
              />
              <p className="text-[10px] text-gray-400">Leave blank to generate a beautiful mock photo automatically.</p>
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setIsRequestAccessOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isRequestingAccess} className="bg-purple-600 hover:bg-purple-700">
                {isRequestingAccess ? "Submitting..." : "Submit Access Request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Host & Request Dashboard Dialog */}
      <Dialog open={isDashboardOpen} onOpenChange={setIsDashboardOpen}>
        <DialogContent className="sm:max-w-[650px] overflow-y-auto max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ClipboardList className="w-6 h-6 text-blue-600" />
              PoolCool Dashboard
            </DialogTitle>
            <DialogDescription>
              Manage approvals, view private coordinates, and trace access request history.
            </DialogDescription>
          </DialogHeader>

          {/* Tab Selector */}
          <div className="flex border-b border-gray-200 mb-4 mt-2">
            <button
              onClick={() => setDashboardTab("my_requests")}
              className={`pb-2.5 px-4 font-bold text-xs uppercase tracking-wider transition-all border-b-2 ${
                dashboardTab === "my_requests" 
                  ? "border-blue-600 text-blue-600" 
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              My Outgoing Requests ({myRequests.length})
            </button>
            {currentUser?.role === "host" && (
              <button
                onClick={() => setDashboardTab("incoming_requests")}
                className={`pb-2.5 px-4 font-bold text-xs uppercase tracking-wider transition-all border-b-2 ${
                  dashboardTab === "incoming_requests" 
                    ? "border-purple-600 text-purple-600" 
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                Incoming Host Requests ({incomingRequests.length})
              </button>
            )}
          </div>

          {/* TAB 1: MY OUTGOING REQUESTS */}
          {dashboardTab === "my_requests" && (
            <div className="space-y-4">
              {myRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Shield className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold">No requests submitted yet.</p>
                  <p className="text-xs text-gray-400 mt-1">Explore private pins on the map to request safe refuge access.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-[450px] overflow-y-auto pr-1">
                  {myRequests.map((req) => (
                    <div key={req.id} className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                          <Lock className="w-3.5 h-3.5 text-purple-600" />
                          {req.space_name || "Private Space refuge"}
                        </h4>
                        <p className="text-xs text-gray-600 mt-1 bg-gray-50 p-2 rounded italic">
                          &ldquo; {req.answers_text} &rdquo;
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {req.status === "approved" && (
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-xs bg-green-100 text-green-800 px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                              Approved
                            </span>
                            <span className="text-[10px] text-gray-500 font-medium">Pin unlocked on map</span>
                          </div>
                        )}
                        {req.status === "pending" && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                            <ShieldAlert className="w-3.5 h-3.5 text-yellow-600" />
                            Pending
                          </span>
                        )}
                        {req.status === "rejected" && (
                          <span className="text-xs bg-red-100 text-red-800 px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                            <X className="w-3.5 h-3.5 text-red-600" />
                            Rejected
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: INCOMING REQUESTS (HOST ONLY) */}
          {dashboardTab === "incoming_requests" && currentUser?.role === "host" && (
            <div className="space-y-4">
              {incomingRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ShieldCheck className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold">No incoming requests yet.</p>
                  <p className="text-xs text-gray-400 mt-1">When users request access to your listed private spaces, they appear here.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
                  {incomingRequests.map((req) => (
                    <div key={req.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50/50 flex flex-col md:flex-row gap-4 items-start justify-between">
                      <div className="flex gap-3 items-start flex-1">
                        {req.photo_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img 
                            src={req.photo_url} 
                            alt="Requester photo" 
                            className="w-14 h-14 object-cover rounded-lg border border-gray-200"
                          />
                        )}
                        <div className="space-y-1">
                          <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">{req.space_name || "Your Private Space"}</p>
                          <h5 className="font-bold text-gray-900 text-xs">Request ID: #{req.id.slice(0, 5)}</h5>
                          <p className="text-xs text-gray-700 bg-white p-2.5 rounded border border-gray-100 italic">
                            &ldquo;{req.answers_text}&rdquo;
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 shrink-0 self-end md:self-center">
                        {req.status === "pending" ? (
                          <>
                            <Button 
                              onClick={() => handleUpdateRequestStatus(req.id, "approved")}
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700 text-white font-bold flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" /> Approve
                            </Button>
                            <Button 
                              onClick={() => handleUpdateRequestStatus(req.id, "rejected")}
                              size="sm" 
                              variant="destructive"
                              className="font-bold flex items-center gap-1"
                            >
                              <X className="w-3.5 h-3.5" /> Reject
                            </Button>
                          </>
                        ) : (
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                            req.status === "approved" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}>
                            {req.status === "approved" ? "Approved" : "Rejected"}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <Button onClick={() => setIsDashboardOpen(false)} variant="secondary" className="font-bold">
              Close Dashboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Space Dialog */}
      <Dialog open={isAddSpaceOpen} onOpenChange={setIsAddSpaceOpen}>
        <DialogContent className="sm:max-w-[425px] overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Add a Cool Space</DialogTitle>
            <DialogDescription>
              Share a public refuge or offer your private space during the heatwave.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSpace} className="grid gap-4 py-4">
            {addSpaceError && <div className="text-sm text-red-500 font-medium">{addSpaceError}</div>}
            
            <div className="grid gap-2">
              <Label htmlFor="name">Name of Space</Label>
              <Input 
                id="name" 
                placeholder="e.g. Downtown Library" 
                required 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description & Rules</Label>
              <Textarea 
                id="description" 
                placeholder="Quiet space, AC is running..." 
                required 
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
            
            <div className="grid gap-2">
              <Label>Location</Label>
              <div className="text-xs text-gray-500 mb-1">Drag the pin to adjust location</div>
              <LocationPickerMap position={newPos} onChange={setNewPos} />
            </div>

            <div className="flex items-center space-x-2 bg-gray-50 p-3 rounded-md border mt-2">
              <Switch id="private-space" checked={isPrivate} onCheckedChange={setIsPrivate} />
              <Label htmlFor="private-space" className="flex flex-col cursor-pointer">
                <span>Make this a Private Space</span>
                <span className="font-normal text-xs text-gray-500">Required login. You can approve the visitors manually.</span>
              </Label>
            </div>

            {isPrivate && (
              <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                <Label htmlFor="access-reqs">Entry Requirements (For Requesters)</Label>
                <Textarea id="access-reqs" placeholder="e.g. Please tell me why you need space." />
              </div>
            )}

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddSpaceOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isAddingSpace}>
                {isAddingSpace ? "Adding..." : "Add Space"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Analyse Space Dialog */}
      <Dialog open={isAnalyseOpen} onOpenChange={(open) => {
        setIsAnalyseOpen(open);
        if (!open) setAnalysisResult(null);
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Analyse My Space</DialogTitle>
            <DialogDescription>
              Upload a photo and answer a few questions. Our AI will estimate the effective cooling drop.
            </DialogDescription>
          </DialogHeader>

          {!analysisResult ? (
            <form onSubmit={handleAnalyse} className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="photo">Upload Photo</Label>
                <Input id="photo" type="file" accept="image/*" />
              </div>
              
              <div className="grid gap-4 mt-2 bg-gray-50 p-4 rounded-md border border-gray-200">
                <h4 className="font-medium text-sm">Environment Questionnaire</h4>
                
                <div className="flex items-center space-x-2">
                  <Switch id="q-sun" checked={hasSun} onCheckedChange={setHasSun} />
                  <Label htmlFor="q-sun">Is there direct sunlight?</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="q-plants" checked={hasPlants} onCheckedChange={setHasPlants} />
                  <Label htmlFor="q-plants">Are there trees or plants nearby?</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="q-ac" checked={hasAC} onCheckedChange={setHasAC} />
                  <Label htmlFor="q-ac">Is Air Conditioning active?</Label>
                </div>
              </div>

              {analysisError && <div className="text-sm text-red-500 font-medium mt-2">{analysisError}</div>}

              <DialogFooter className="mt-4">
                <Button type="submit" disabled={isAnalyzing} className="w-full">
                  {isAnalyzing ? "Analyzing Environment..." : "Run AI Analysis"}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="py-6 animate-in zoom-in-95">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6 text-center">
                <h3 className="text-xl font-bold text-blue-900 mb-2">Analysis Complete</h3>
                
                <div className="flex justify-center items-center gap-8 my-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-500 font-medium mb-1">Baseline Temp</p>
                    <div className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-1">
                      {analysisResult.baseline}°<Flame className="w-5 h-5 text-orange-500" />
                    </div>
                  </div>
                  
                  <div className="text-3xl text-blue-300">→</div>
                  
                  <div className="text-center">
                    <p className="text-sm text-blue-600 font-medium mb-1">Effective Temp</p>
                    <div className="text-4xl font-black text-blue-600 flex items-center justify-center gap-1">
                      {analysisResult.effective}°
                    </div>
                  </div>
                </div>

                <div className="bg-white/60 rounded-lg p-3 text-sm text-blue-800 font-medium">
                  AI estimates a cooling effect of <span className="font-bold">{Math.abs(analysisResult.diff)}°F</span> compared to ambient temperature.
                </div>
              </div>
              <Button onClick={() => setIsAnalyseOpen(false)} className="w-full mt-4">
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Find Full Screen Modal */}
      {isFindOpen && (
        <div className="absolute inset-0 z-[2000] bg-white flex flex-col animate-in slide-in-from-bottom-full duration-300 ease-out">
          <div className="flex items-center gap-3 p-4 border-b border-gray-100 shrink-0 shadow-sm">
            <Button variant="ghost" size="icon" onClick={() => setIsFindOpen(false)} className="rounded-full shrink-0">
              <X className="w-5 h-5 text-gray-500" />
            </Button>
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cool spaces..."
                className="pl-9 bg-gray-50 border-gray-200 rounded-full h-10 w-full"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              <div className="max-w-3xl mx-auto space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Nearest Spaces
                  </h3>
                  {userLocation && (
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                      <Navigation className="w-3 h-3" /> Location Active
                    </span>
                  )}
                </div>

                {filteredSpaces.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm font-medium">No spaces found.</p>
                  </div>
                ) : (
                  filteredSpaces.map((space) => (
                    <div 
                      key={space.id} 
                      onClick={() => {
                        setCenterSpace(space);
                        setIsFindOpen(false);
                      }}
                      className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-start gap-4 hover:border-blue-300 hover:shadow-md cursor-pointer transition-all text-left w-full select-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          setCenterSpace(space);
                          setIsFindOpen(false);
                        }
                      }}
                    >
                      {space.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={space.image_url} alt={space.name} className="w-16 h-16 object-cover rounded-lg shrink-0 mt-0.5" />
                      ) : (
                        <div className="w-16 h-16 bg-blue-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                          <ThermometerSun className="w-6 h-6 text-blue-300" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-gray-900 truncate pr-2">{space.name}</h4>
                          {space.distance !== null && (
                            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded shrink-0">
                              {space.distance.toFixed(1)} km
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{space.description}</p>
                        
                        <div className="flex justify-between items-center mt-3 gap-2">
                          <div className="flex gap-1.5 flex-wrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${space.is_private ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                              {space.is_private ? 'Private' : 'Public'}
                            </span>
                            {space.is_ai_analyzed && (
                              <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                <ThermometerSun className="w-3 h-3" /> AI Analyzed
                              </span>
                            )}
                          </div>

                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${space.lat},${space.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent triggering the card click
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] sm:text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all shadow-sm shrink-0 z-10 hover:shadow active:scale-95"
                          >
                            <Navigation className="w-3.5 h-3.5 fill-current" />
                            Get Directions
                          </a>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
    </main>
  );
}
