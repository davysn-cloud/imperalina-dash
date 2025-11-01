import { ProfileSettings } from "@/components/profile-settings"

export default function ProfilePage() {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Configurações de Perfil</h1>
      <ProfileSettings />
    </div>
  )
}