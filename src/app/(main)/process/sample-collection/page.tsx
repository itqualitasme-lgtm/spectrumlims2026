import { redirect } from "next/navigation"

// Sample Collection has been merged into Sample Registration
export default function SampleCollectionPage() {
  redirect("/process/registration/new")
}
