// Function to send return request data to Google Apps Script
function sendData() {
    const orderNumber = document.getElementById("orderNumber").value;
    const phone = document.getElementById("phoneNumber").value;
    const checkbox = document.getElementById("policyCheck");
    const msg = document.getElementById("msg");

    // Check if policy checkbox is checked
    if (!checkbox.checked) {
        msg.innerText = "لازم توافق على السياسة ❌";
        msg.style.color = "red";
        return;
    }

    // Check if required fields are filled
    if (!orderNumber || !phone) {
        msg.innerText = "املأ البيانات ❌";
        msg.style.color = "red";
        return;
    }

    // Google Apps Script URL for handling the request
    const url = "https://script.google.com/macros/s/AKfycbypLozGQgut-3edEb-Vq675zjqk3n1okFLnYF0K3OQZD8xmgkG7Yg_Db1E9A0bwdU5n6w/exec";

    // Send POST request to Google Apps Script
    fetch(url, {
        method: "POST",
        body: new URLSearchParams({
            orderNumber: orderNumber,
            phone: phone
        })
    })
        .then(() => {
            // Success message
            msg.innerText = "تم إرسال الطلب بنجاح ✅";
            msg.style.color = "green";
            // Clear form fields
            document.getElementById("orderNumber").value = "";
            document.getElementById("phoneNumber").value = "";
            document.getElementById("policyCheck").checked = false;
        })
        .catch(() => {
            // Error message
            msg.innerText = "حصل خطأ ❌ حاول مرة تانية";
            msg.style.color = "red";
        });
}