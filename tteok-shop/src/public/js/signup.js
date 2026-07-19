console.log("Signup frontend javascript file");

$(function () {
    const fileTarget = $(".file-box .upload-hidden");
    let filename;

    fileTarget.on("change", function () {
        if (window.FileReader) {
            const uploadFile = $(this)[0].files[0],
             hasFile = Boolean(uploadFile);

            if (!hasFile) return;

            const
             fileType = uploadFile["type"],
             validImageType = ["image/jpg", "image/jpeg", "image/png"];
            
            if (!validImageType.includes(fileType)) {
                alert("Please insert only jpeg, jpg and png!");
            } else {
                if (uploadFile) {
                    console.log(URL.createObjectURL(uploadFile));
                    $(".upload-img-frame")
                        .attr("src", URL.createObjectURL(uploadFile))
                        .addClass("success");
                }
                filename = $(this)[0].files[0].name;
            }
            $(this).siblings(".upload-name").val(filename);
        }
    });
});

function validateSignupForm(form) {
  const memberNick = form ? form.memberNick.value : $(".member-nick").val(),
   memberPhone = form ? form.memberPhone.value : $(".member-phone").val(),
   memberPassword = form ? form.memberPassword.value : $(".member-password").val(),
    confirmPassword = form ? form.confirmPassword.value : $(".confirm-password").val();

  if (
    memberNick === "" ||
    memberPhone === "" ||
    memberPassword === "" ||
    confirmPassword === ""
  ) {
    alert("Please insert all required inputs!");
    return false;
  }

  if (memberPassword !== confirmPassword) {
    alert("Password differs, please check!");
    return false;
  }

   const memberImageInput = form ? form.memberImage : $(".member-image").get(0);
   const memberImage = memberImageInput && memberImageInput.files[0]
   ? memberImageInput.files[0].name
   : null
   if (!memberImage) {
    alert("please insert restaurant image!");
    return false;
   }

   return true;
}
