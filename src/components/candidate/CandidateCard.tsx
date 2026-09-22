"use client";

import React from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Scale, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Candidate } from "@/lib/candidate-data";

interface CandidateCardProps {
  candidate: Candidate;
  className?: string;
  showVerifyBadge?: boolean;
  onCompare?: (id: string) => void;
  isCompared?: boolean;
  onSelect?: (id: string) => void;
  isSelected?: boolean;
}

export const CandidateCard: React.FC<CandidateCardProps> = ({
  candidate,
  className,
  showVerifyBadge = true,
  onCompare,
  isCompared = false,
  onSelect,
  isSelected = false,
}) => {
  return (
    <Card className={cn(
      "h-full border-border rounded-2xl overflow-hidden hover:shadow-md transition-all",
      isSelected && "ring-2 ring-primary-600",
      className
    )}>
      {/* Photo area */}
      <div className="relative h-44 w-full bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center overflow-hidden">
        {candidate.profilePhotoUrl ? (
          <img
            src={candidate.profilePhotoUrl}
            alt={candidate.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-primary-600 flex items-center justify-center font-bold text-white text-2xl shadow-sm">
            {candidate.photoInitials}
          </div>
        )}

        {/* Campaign symbol */}
        <div className="absolute top-3 right-3 w-9 h-9 rounded-xl bg-white/90 backdrop-blur-sm flex items-center justify-center text-xl shadow-sm border border-white/50">
          {candidate.campaignSymbol}
        </div>

        {/* Candidate ID badge */}
        <div className="absolute top-3 left-3">
          <Badge variant="neutral" className="text-[10px] font-mono bg-white/90 backdrop-blur-sm">
            {candidate.id}
          </Badge>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-3">
        <div>
          <h3 className="font-semibold text-text-primary text-sm leading-tight">
            {candidate.name}
          </h3>
          <p className="text-xs text-primary-400 font-medium mt-0.5">
            {candidate.position}
          </p>
          <p className="text-[10px] text-text-secondary font-medium uppercase tracking-wider mt-0.5">
            {candidate.department} &bull; {candidate.year}
          </p>
        </div>

        <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
          {candidate.biography}
        </p>

        {showVerifyBadge && candidate.verified && (
          <Badge variant="success" className="text-[10px] w-fit">
            &#10003; Verified Profile
          </Badge>
        )}

        <div className="pt-3 border-t border-border space-y-2">
          <div className="flex gap-2">
            {onCompare && (
              <Button
                variant={isCompared ? "primary" : "ghost"}
                size="sm"
                onClick={() => onCompare(candidate.id)}
                className="flex-1 justify-center gap-1.5"
              >
                <Scale className="w-3.5 h-3.5" />
                {isCompared ? "Added" : "Compare"}
              </Button>
            )}
            {onSelect && (
              <Button
                variant={isSelected ? "primary" : "ghost"}
                size="sm"
                onClick={() => onSelect(candidate.id)}
                className="flex-1 justify-center gap-1.5"
              >
                {isSelected ? <><Check className="w-3.5 h-3.5" /> Selected</> : "Select"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
