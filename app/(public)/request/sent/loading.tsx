import { RequestSent } from "@/components/public/request/RequestSent";

// Loading skeleton for /request/sent (Skel-Request-Sent-Desktop / -Mobile.dc.html).
export default function Loading() {
  return (
    <div className="skel" aria-busy="true" aria-label="Loading">
      <RequestSent skeleton />
    </div>
  );
}
