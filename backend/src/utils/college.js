// PES student email rule: pes1ug24cs693@stu.pes.edu
//   pes + campus digit + ug/pg + 2-digit batch + branch letters + roll digits
const EMAIL_RE = /^pes(\d)([a-z]{2})(\d{2})([a-z]{2,4})(\d{3,4})@stu\.pes\.edu$/;

function isCollegeEmail(email) {
  return EMAIL_RE.test(email);
}

// Pull SRN, branch and batch year out of the email
function parseCollegeEmail(email) {
  const m = EMAIL_RE.exec(email);
  if (!m) return {};
  return {
    srn: email.split('@')[0].toUpperCase(),
    admission_year: 2000 + Number(m[3]),
    branch: m[4].toUpperCase(),
  };
}

module.exports = { isCollegeEmail, parseCollegeEmail };
