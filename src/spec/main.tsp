import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi3";

import "./models.tsp";
import "./routes/owner.tsp";
import "./routes/guest.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;

@service(#{
  title: "Запись на звонок — Call Booking Service",
})
@doc("""
  Simplified call booking service inspired by Cal.com.
  No authentication or registration required. One hardcoded calendar owner.
  Guests can browse event types, view available slots, and create bookings.
  The owner can manage event types and view all upcoming bookings.
""")
namespace CallBooking;
