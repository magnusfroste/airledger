import { useState } from "react";
import NavigationHeader from "@/components/navigation/NavigationHeader";
import BottomNavigation from "@/components/navigation/BottomNavigation";
import MoreMenu from "@/components/navigation/MoreMenu";
import UserProfile from "@/components/navigation/UserProfile";
import { useNavigationData } from "@/hooks/useNavigationData";
import { useSignOut } from "@/hooks/useSignOut";
import { getMoreMenuItems } from "@/constants/navigationItems";

const Navigation = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { transactionCount } = useNavigationData();
  const { handleSignOut } = useSignOut();
  const moreMenuItems = getMoreMenuItems();

  const handleMenuClose = () => {
    setIsMobileMenuOpen(false);
  };

  const handleSignOutWrapper = async () => {
    await handleSignOut();
    handleMenuClose();
  };

  const moreMenuContent = (
    <>
      <UserProfile />
      <MoreMenu 
        moreMenuItems={moreMenuItems}
        onLinkClick={handleMenuClose}
        onSignOut={handleSignOutWrapper}
      />
    </>
  );

  return (
    <>
      <NavigationHeader />
      <BottomNavigation
        transactionCount={transactionCount}
        moreMenuItems={moreMenuItems}
        isMoreMenuOpen={isMobileMenuOpen}
        setIsMoreMenuOpen={setIsMobileMenuOpen}
        moreMenuContent={moreMenuContent}
      />
    </>
  );
};

export default Navigation;