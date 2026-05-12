 console.log("Products frontend javascript file");


$(function () {                                                        // DOM to‘liq yuklangandan keyin kod ishlaydi

    $(".product-collection").on("change", () => {                       // product-collection select o‘zgarganda
        const selectedValue = $(".product-collection").val();           // tanlangan qiymatni oladi
        if (selectedValue === "DRINK") {                                // agar qiymat "DRINK" bo‘lsa
            $("#product-collection").hide();                            // product-collection inputni yashiradi
            $("#product-volume").show();                                // product-volume inputni ko‘rsatadi
        } else {                                                        // aks holda
            $("#product-volume").hide();                                 // product-volume inputni yashiradi
            $("#product-collection").show();                             // product-collection inputni ko‘rsatadi
        }
    });

    $("#process-btn").on("click", () => {                               // process-btn bosilganda
        $(".dish-container").slideToggle(500);                          // dish-container ni 500ms da ochib/yopadi
        $("#process-btn").css("display", "none");                       // process-btn ni yashiradi
    });

    $("#cancel-btn").on("click", () => {                                  // cancel-btn bosilganda
        $(".dish-container").slideToggle(100);                            // dish-container ni 100ms da ochib/yopadi
        $("#process-btn").css("display", "flex");                          // process-btn ni qayta ko‘rsatadi
    });

    $(".new-product-status").on("change", async function (e) { 
    const id = e.target.id;                                                          // o‘zgartirilgan select elementining id qiymatini oladi
    const productStatus = $(`#${id}.new-product-status`).val();                      // tanlangan yangi statusni oladi
    
    try {
        
        const response = await axios.post(`/admin/product/${id}`, {productStatus: productStatus});  // serverga POST so‘rov yuboradi, mahsulot statusini yangilash uchun
        console.log("response:", response);                                   // serverdan kelgan javobni konsolga chiqaradi
        const result = response.data;                                       // javobdagi data ni oladi
        if(result.data) {                                                   // agar serverdan ijobiy javob kelsa
            $(`.new-product-status`).blur();                                // select elementdan fokusni olib tashlaydi
        } else alert("Product update failed!");                             // agar muvaffaqiyatsiz bo‘lsa, alert chiqaradi
    } catch(err) {
        console.log(err);                                                   // xatolikni konsolga chiqaradi
        alert("Product update failed!");                                    // foydalanuvchiga xatolik haqida xabar beradi
    }
 });

});


function validateForm() {
    const productName = $(".product-name").val();
    const productPrice = $(".product-price").val();
    const productLeftCount = $(".product-left-count").val();
    const productCollection = $(".product-collection").val();
    const productDesc = $(".product-desc").val();
    const productStatus = $(".product-status").val();

    if (
        productName === "" ||
        productPrice === "" ||
        productLeftCount === "" ||
        productCollection === "" ||
        productDesc === "" ||
        productStatus === ""
    ) {
        alert("Please insert all details!");
        return false;
    } else return true;
}

//==============product images=====
function previewFileHandler(input, order) {
    const imgClassName = input.className;                                         // input elementning class nomini oladi
    console.log("input:", input);                                                // input elementni konsolga chiqaradi (debug uchun)

    const file = $(`.${imgClassName}`).get(0).files[0];                         // input orqali tanlangan faylni oladi
    const fileType = file["type"];                                              // faylning turini oladi (masalan: image/png)
    const validImageType = ["image/jpg", "image/jpeg", "image/png"];              // ruxsat etilgan fayl turlari

    if (!validImageType.includes(fileType)) {                                     // agar fayl turi ruxsat etilganlardan bo‘lmasa
        alert("Please insert only jpeg, jpg and png!");                            // foydalanuvchiga xabar chiqaradi
    } else {
        if (file) {                                                                // agar fayl mavjud bo‘lsa
            const reader = new FileReader();                                        // FileReader obyektini yaratadi
            reader.onload = function () {                                            // fayl o‘qilgandan keyin ishlaydigan funksiya
                $(`#image-section-${order}`).attr("src", reader.result);              // o‘qilgan faylni (rasmni) <img> elementiga src sifatida qo‘yadi
            };
            reader.readAsDataURL(file);                                                // faylni DataURL ko‘rinishida o‘qiydi
        }
    }
}