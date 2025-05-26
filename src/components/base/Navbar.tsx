import { Link } from 'react-router-dom';
import '../../css/NavbarOption.css';

type NavbarOptionProps = {
  label: string;
  url: string;
  onClick?: () => void;
};

const NavbarOption = ({ label, url, onClick }: NavbarOptionProps) => {
  if (onClick) {
    return (
      <li className="nav-item mx-2">
        <button
          className="navbar-option-link nav-button"
          onClick={onClick}
          type="button"
        >
          {label}
        </button>
      </li>
    );
  } else {
    return (
      <li className="nav-item mx-2">
        <Link className="navbar-option-link" to={url}>
          {label}
        </Link>
      </li>
    );
  }
};

export default NavbarOption;
