$("#contact-form").submit(function (e) {
  e.preventDefault();
  var th = $(this);

  // Récupération des données du formulaire
  const name = th.find('input[name="Name"]').val().trim();
  const email = th.find('input[name="E-mail"]').val().trim();
  const message = th.find('textarea[name="Message"]').val().trim();

  // Réinitialiser les messages d’erreur
  $(".error-message").remove();
  th.find("input, textarea").css("border-color", "");

  let hasError = false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!name) {
    th.find('input[name="Name"]').css("border-color", "red")
      .after('<div class="error-message" style="color:red;font-size:0.9em;margin-top:4px;">Veuillez saisir votre nom.</div>');
    hasError = true;
  }

  if (!email) {
    th.find('input[name="E-mail"]').css("border-color", "red")
      .after('<div class="error-message" style="color:red;font-size:0.9em;margin-top:4px;">Veuillez saisir une adresse email.</div>');
    hasError = true;
  } else if (!emailRegex.test(email)) {
    th.find('input[name="E-mail"]').css("border-color", "red")
      .after('<div class="error-message" style="color:red;font-size:0.9em;margin-top:4px;">Veuillez saisir une adresse email valide.</div>');
    hasError = true;
  }

  if (!message) {
    th.find('textarea[name="Message"]').css("border-color", "red")
      .after('<div class="error-message" style="color:red;font-size:0.9em;margin-top:4px;">Veuillez entrer un message.</div>');
    hasError = true;
  }

  if (hasError) return false;



  // Envoi des données vers le backend Express
  fetch('/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, message })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        // Affichage message de confirmation
        $('.form').addClass('is-hidden');
        $('.form__reply').addClass('is-visible');

        // Réinitialisation après 5 secondes
        setTimeout(function () {
          $('.form__reply').removeClass('is-visible');
          $('.form').delay(300).removeClass('is-hidden');
          th.trigger("reset");
        }, 5000);
      } else {
        alert("Erreur : " + data.message);
      }
    })
    .catch(error => {
      console.error("Erreur : ", error);
      alert("Une erreur est survenue. Veuillez réessayer.");
    });

  return false;
});
