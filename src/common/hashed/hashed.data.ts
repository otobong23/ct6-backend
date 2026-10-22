import * as bcrypt from 'bcrypt';



export const HashData = async (input: string)=>{
    const salt = 10;
    const hashed = await bcrypt.hash(input, salt);
    return hashed
}

export const comparedHashed = async(userInput: string, dbInput: string): Promise<boolean>=>{
   return await bcrypt.compare(userInput, dbInput );

}
