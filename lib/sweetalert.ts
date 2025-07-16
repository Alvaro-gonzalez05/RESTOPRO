"use client"

// Función para mostrar alertas de éxito
export const showSuccessAlert = (title: string, text?: string) => {
  if (typeof window !== "undefined") {
    // Importación dinámica para evitar problemas de SSR
    import("sweetalert2").then((Swal) => {
      Swal.default.fire({
        icon: "success",
        title: title,
        text: text,
        confirmButtonColor: "#2563eb",
        timer: 3000,
        timerProgressBar: true,
      })
    })
  }
}

// Función para mostrar alertas de error
export const showErrorAlert = (title: string, text?: string) => {
  if (typeof window !== "undefined") {
    import("sweetalert2").then((Swal) => {
      Swal.default.fire({
        icon: "error",
        title: title,
        text: text,
        confirmButtonColor: "#2563eb",
      })
    })
  }
}

// Función para mostrar alertas de confirmación
export const showConfirmAlert = (title: string, text: string) => {
  if (typeof window !== "undefined") {
    return import("sweetalert2").then((Swal) => {
      return Swal.default.fire({
        title: title,
        text: text,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#2563eb",
        cancelButtonColor: "#dc2626",
        confirmButtonText: "Sí, continuar",
        cancelButtonText: "Cancelar",
      })
    })
  }
  return Promise.resolve({ isConfirmed: false })
}
