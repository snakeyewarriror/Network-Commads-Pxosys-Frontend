import Layout from '../base/BaseLayout';

import FormRegister from '../forms/FormRegister';

const Register = () => {

  return (
    <Layout title="Pxosys">
      <div className="text-center mt-5">
        <FormRegister route="/portal/admin-creation/" method="register" />
      </div>
    </Layout>
  )
}

export default Register
