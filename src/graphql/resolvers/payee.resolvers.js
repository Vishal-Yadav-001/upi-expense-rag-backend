const Payee = require('../../models/Payee');
const {updatePayeeConfidence} = require('../../services/payeeService');

const payeeResolvers = {
    Mutation:{
        categorizePayee: async (_,{payeeId,category}) =>{
            const payee = await Payee.findById(payeeId);
            console.log('Found payee:', payee);
            if(!payee){
                throw new Error('Payee not found');
            }
            payee.category = category;
            payee.confidence = 0.9; // user-confirmed
            await payee.save();
            return payee;
        },
        confirmPayeeCategory: async(_,{payeeId,category}) =>{
            const payee = await Payee.findById(payeeId);
            if(!payee){
                throw new Error('Payee not found');
            }

            await updatePayeeConfidence(payee,category,"USER_CONFIRMED");
            return payee;
        }
    }
}

module.exports = payeeResolvers;