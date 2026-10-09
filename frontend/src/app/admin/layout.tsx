import Sesi from "@/components/Sesi";
import KerangkaAdmin from "./KerangkaAdmin";

export default function LayoutAdmin({ children }: { children: React.ReactNode }) {
  return (
    <Sesi peran="admin">
      <KerangkaAdmin>{children}</KerangkaAdmin>
    </Sesi>
  );
}
