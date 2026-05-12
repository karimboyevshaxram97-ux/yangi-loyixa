

console.log("Users frontend javascript file");

$(function()   {
    $(".member-status").on("change", function (e) {
        const id = e.target.id,
        memberStatus = $(`#${id}.member-status`).val();

        axios                                                 // 3. Serverga (Backendga) ma'lumot yuborish qismi boshlanadi
        .post("/admin/user/edit", {                           // 4. "/admin/user/edit" manziliga POST so'rovi yuboriladi
          _id: id,                                            // Serverga foydalanuvchi IDsi yuboriladi
          memberStatus: memberStatus,
        })
        .then((response) => {
            console.log("response:", response);
            const result = response.data;

          if (result.data) {
            $(".member-status").blur();
          }  else alert("User update failed!");
        })
        .catch((err) => {
            console.log(err);
            alert("User update failed");
        });
    });
});