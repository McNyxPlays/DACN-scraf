// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ModelShopNFT is ERC721URIStorage, ERC721Royalty, Ownable {
    uint256 public nextTokenId = 1;

    mapping(uint256 => uint256) public maxSupply;
    mapping(uint256 => uint256) public mintedCount;

    constructor() ERC721("Model Shop NFT", "MSNFT") Ownable() {}

    // ĐÚNG CÚ PHÁP CHO OPENZEPPELIN v4.9.6
    function _burn(uint256 tokenId) internal override(ERC721URIStorage, ERC721Royalty) {
        super._burn(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, ERC721Royalty)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function mint(
        address to,
        string memory uri,
        uint96 royaltyBps,
        uint256 _maxSupply
    ) external onlyOwner returns (uint256) {
        uint256 tokenId = nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        if (royaltyBps > 0) {
            _setTokenRoyalty(tokenId, owner(), royaltyBps);
        }

        maxSupply[tokenId] = _maxSupply;
        mintedCount[tokenId] = 1;

        return tokenId;
    }

    function mintMore(uint256 tokenId, address to) external onlyOwner {
        require(maxSupply[tokenId] == 0 || mintedCount[tokenId] < maxSupply[tokenId], "Max supply reached");
        mintedCount[tokenId]++;
        _safeMint(to, tokenId);
    }
}