document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const registerMessage = document.getElementById("registerMessage");

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const data = {
        email: loginForm.email.value,
        password: loginForm.password.value,
      };

      try {
        const response = await fetch("/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (response.ok) {
          localStorage.setItem("user_id", result.user.user_id);
          localStorage.setItem("full_name", result.user.full_name);
          localStorage.setItem("email", result.user.email);
          localStorage.setItem("role_id", result.user.role_id);

          if (String(result.user.role_id) === "3") {
            window.location.href = "/technician.html";
          } else if (String(result.user.role_id) === "1") {
            window.location.href = "/admin.html";
          } else {
            window.location.href = "/dashboard.html";
          }
        } else {
          alert(result.error || "Login failed");
        }
      } catch (err) {
        console.error(err);
        alert("Server error");
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const data = {
        full_name: registerForm.full_name.value,
        email: registerForm.email.value,
        password: registerForm.password.value,
      };

      try {
        const response = await fetch("/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (response.ok) {
          setMessage(
            registerMessage,
            "Registration successful. Now you can log in.",
            "good",
          );
          registerForm.reset();
        } else {
          setMessage(registerMessage, result.error || "Registration failed.", "error");
        }
      } catch (error) {
        setMessage(registerMessage, "Server error.", "error");
        console.error(error);
      }
    });
  }
});
