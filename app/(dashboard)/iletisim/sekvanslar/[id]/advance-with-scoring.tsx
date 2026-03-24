"use client";

import { useState, useTransition } from "react";
import { ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { advanceStep } from "@/actions/contact-sequences";
import { ScoringModal } from "./scoring-modal";
import { useRouter } from "next/navigation";

interface Props {
  customerSequenceId: string;
  customerId: string;
  stepNo: number;
  channel: string;
  seqName: string;
  customerName: string;
  isLastStep: boolean;
}

export function AdvanceWithScoring({
  customerSequenceId, customerId, stepNo, channel, seqName, customerName, isLastStep
}: Props) {
  const [showScoring, setShowScoring] = useState(false);
  const [advancing, startTransition] = useTransition();
  const router = useRouter();

  const handleAdvance = () => {
    startTransition(async () => {
      await advanceStep(customerSequenceId);
      // Puanlama modalını her temas sonrası göster
      setShowScoring(true);
    });
  };

  return (
    <>
      <Button
        size="sm"
        variant="default"
        className="gap-1.5"
        onClick={handleAdvance}
        disabled={advancing}
      >
        {advancing ? (
          "İşleniyor..."
        ) : isLastStep ? (
          <><CheckCircle2 className="w-3.5 h-3.5" /> Tamamla</>
        ) : (
          <><ChevronRight className="w-3.5 h-3.5" /> Sonraki Adıma Geç</>
        )}
      </Button>

      {showScoring && (
        <ScoringModal
          customerSequenceId={customerSequenceId}
          customerId={customerId}
          stepNo={stepNo}
          channel={channel}
          seqName={seqName}
          customerName={customerName}
          onClose={() => { setShowScoring(false); router.refresh(); }}
          onDone={() => { setShowScoring(false); router.refresh(); }}
        />
      )}
    </>
  );
}
